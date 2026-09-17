import { CurlParseResult, CurlExecutionResult } from '../types';

export async function executeCurlRequest(
  parsed: CurlParseResult,
  useProxy: boolean = true
): Promise<CurlExecutionResult> {
  const headers = { ...parsed.headers };
  if (parsed.auth) {
    const b64 = btoa(`${parsed.auth.user}:${parsed.auth.pass}`);
    headers['Authorization'] = `Basic ${b64}`;
  }
  if (Object.keys(parsed.cookies).length > 0) {
    const cookieStr = Object.entries(parsed.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers['Cookie'] = cookieStr;
  }

  if (useProxy) {
    // Execute through Parso proxy (Bypasses CORS, allows forbidden headers)
    const res = await fetch('/api/curl/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: parsed.method,
        url: parsed.url,
        headers,
        data: parsed.data,
      }),
    });

    const data: CurlExecutionResult = await res.json();
    return data;
  } else {
    // Direct in-browser fetch
    const startTime = performance.now();
    try {
      const options: RequestInit = {
        method: parsed.method,
        headers,
      };
      if (parsed.data && !['GET', 'HEAD'].includes(parsed.method.toUpperCase())) {
        options.body = parsed.data;
      }
      const response = await fetch(parsed.url, options);
      const durationMs = Math.round(performance.now() - startTime);

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      const bodyText = await response.text();
      let isJson = false;
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(bodyText);
        isJson = true;
      } catch {}

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText || (response.status === 200 ? 'OK' : `${response.status}`),
        headers: resHeaders,
        body: bodyText,
        isJson,
        parsedJson,
        durationMs,
        sizeBytes: new Blob([bodyText]).size,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      return {
        success: false,
        status: 0,
        statusText: 'CORS or Network Error',
        headers: {},
        body: err.message || 'Direct browser fetch failed (likely blocked by CORS policy). Switch to "Proxy Execution" mode to execute successfully!',
        isJson: false,
        durationMs,
        sizeBytes: 0,
        error: `${err.message || 'Network error'}. Direct browser requests are subject to CORS. Switch to "Proxy Mode" above to bypass CORS!`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export function parseCurl(curlCommand: string): CurlParseResult {
  if (!curlCommand || !curlCommand.trim()) {
    return {
      method: 'GET',
      url: '',
      headers: {},
      cookies: {},
      isValid: false,
      error: 'Empty cURL command input',
    };
  }

  // Normalize multiline backslashes and carriage returns
  const cleanInput = curlCommand
    .replace(/\\\r?\n/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (!cleanInput.toLowerCase().startsWith('curl')) {
    return {
      method: 'GET',
      url: '',
      headers: {},
      cookies: {},
      isValid: false,
      error: 'Command must begin with "curl"',
    };
  }

  // Tokenize bash command respecting single & double quotes
  const tokens: string[] = [];
  let currentToken = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < cleanInput.length; i++) {
    const c = cleanInput[i];

    if (c === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (c === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (c === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
      continue;
    }

    currentToken += c;
  }
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  let method = '';
  let url = '';
  const headers: Record<string, string> = {};
  const cookies: Record<string, string> = {};
  let data = '';
  let auth: { user: string; pass: string } | undefined;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase();
      }
    } else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerStr = tokens[++i];
        const colonIndex = headerStr.indexOf(':');
        if (colonIndex !== -1) {
          const key = headerStr.slice(0, colonIndex).trim();
          const val = headerStr.slice(colonIndex + 1).trim();
          headers[key] = val;
        }
      }
    } else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode' ||
      token === '--json'
    ) {
      if (i + 1 < tokens.length) {
        data = tokens[++i];
        if (token === '--json' && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    } else if (token === '-b' || token === '--cookie') {
      if (i + 1 < tokens.length) {
        const cookieStr = tokens[++i];
        cookieStr.split(';').forEach((c) => {
          const [k, v] = c.split('=');
          if (k && v) {
            cookies[k.trim()] = v.trim();
          }
        });
      }
    } else if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        const authStr = tokens[++i];
        const [user, pass] = authStr.split(':');
        auth = { user: user || '', pass: pass || '' };
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      url = token;
    } else if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  // Default method heuristics
  if (!method) {
    method = data ? 'POST' : 'GET';
  }

  if (!url) {
    return {
      method,
      url: '',
      headers,
      cookies,
      data,
      auth,
      isValid: false,
      error: 'Could not detect target URL from command',
    };
  }

  return {
    method,
    url,
    headers,
    cookies,
    data,
    auth,
    isValid: true,
  };
}

export function generateFetchCode(parsed: CurlParseResult): string {
  const options: Record<string, any> = {
    method: parsed.method,
  };

  const headers = { ...parsed.headers };

  // Add cookies if any
  if (Object.keys(parsed.cookies).length > 0) {
    const cookieStr = Object.entries(parsed.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers['Cookie'] = cookieStr;
  }

  // Add basic auth header if needed
  if (parsed.auth) {
    const b64 = btoa(`${parsed.auth.user}:${parsed.auth.pass}`);
    headers['Authorization'] = `Basic ${b64}`;
  }

  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }

  let bodySetup = '';
  if (parsed.data) {
    try {
      // Check if valid JSON to format cleanly
      JSON.parse(parsed.data);
      bodySetup = `  body: JSON.stringify(${parsed.data}),\n`;
    } catch {
      bodySetup = `  body: ${JSON.stringify(parsed.data)},\n`;
    }
  }

  const headersFormatted = Object.keys(headers).length > 0
    ? `  headers: {\n${Object.entries(headers)
        .map(([k, v]) => `    '${k}': '${v}'`)
        .join(',\n')}\n  },\n`
    : '';

  return `// Native JavaScript (Fetch API)
async function executeRequest() {
  const response = await fetch('${parsed.url}', {
    method: '${parsed.method}',
${headersFormatted}${bodySetup}  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const data = await response.json();
  console.log('Response:', data);
  return data;
}

executeRequest().catch(console.error);`;
}

export function generateAxiosCode(parsed: CurlParseResult): string {
  const headers = { ...parsed.headers };
  if (parsed.auth) {
    const b64 = btoa(`${parsed.auth.user}:${parsed.auth.pass}`);
    headers['Authorization'] = `Basic ${b64}`;
  }

  let dataArg = '';
  if (parsed.data) {
    try {
      const parsedData = JSON.parse(parsed.data);
      dataArg = `\n  data: ${JSON.stringify(parsedData, null, 2).replace(/\n/g, '\n  ')},`;
    } catch {
      dataArg = `\n  data: ${JSON.stringify(parsed.data)},`;
    }
  }

  const headersBlock = Object.keys(headers).length > 0
    ? `\n  headers: {\n${Object.entries(headers)
        .map(([k, v]) => `    '${k}': '${v}'`)
        .join(',\n')}\n  },`
    : '';

  return `// Axios (Node.js & Browser)
import axios from 'axios';

async function executeRequest() {
  const config = {
    method: '${parsed.method.toLowerCase()}',
    url: '${parsed.url}',${headersBlock}${dataArg}
  };

  const response = await axios(config);
  console.log('Status:', response.status);
  console.log('Data:', response.data);
  return response.data;
}

executeRequest().catch(console.error);`;
}

export function generatePythonRequestsCode(parsed: CurlParseResult): string {
  const lines: string[] = ['# Python 3 (Requests library)', 'import requests', ''];

  let headerDict = '';
  if (Object.keys(parsed.headers).length > 0) {
    headerDict = 'headers = {\n' +
      Object.entries(parsed.headers)
        .map(([k, v]) => `    "${k}": "${v}",`)
        .join('\n') +
      '\n}\n';
    lines.push(headerDict);
  }

  let dataAssignment = '';
  let payloadParam = '';
  if (parsed.data) {
    try {
      JSON.parse(parsed.data);
      dataAssignment = `payload = ${parsed.data}\n`;
      payloadParam = ', json=payload';
    } catch {
      dataAssignment = `payload = """${parsed.data}"""\n`;
      payloadParam = ', data=payload';
    }
    lines.push(dataAssignment);
  }

  let authParam = '';
  if (parsed.auth) {
    authParam = `, auth=("${parsed.auth.user}", "${parsed.auth.pass}")`;
  }

  const headersParam = Object.keys(parsed.headers).length > 0 ? ', headers=headers' : '';
  const methodLower = parsed.method.toLowerCase();

  lines.push(`response = requests.${methodLower}(`);
  lines.push(`    "${parsed.url}"${headersParam}${payloadParam}${authParam}`);
  lines.push(')');
  lines.push('');
  lines.push('print("Status Code:", response.status_code)');
  lines.push('print("Response:", response.text)');

  return lines.join('\n');
}

export function generatePythonHttpxCode(parsed: CurlParseResult): string {
  const lines: string[] = ['# Python 3 Async (httpx)', 'import httpx', 'import asyncio', ''];

  let headerDict = '';
  if (Object.keys(parsed.headers).length > 0) {
    headerDict = 'headers = {\n' +
      Object.entries(parsed.headers)
        .map(([k, v]) => `    "${k}": "${v}",`)
        .join('\n') +
      '\n}\n';
    lines.push(headerDict);
  }

  lines.push('async def main():');
  lines.push('    async with httpx.AsyncClient() as client:');

  const headersParam = Object.keys(parsed.headers).length > 0 ? ', headers=headers' : '';
  let dataParam = '';
  if (parsed.data) {
    try {
      JSON.parse(parsed.data);
      dataParam = `, json=${parsed.data}`;
    } catch {
      dataParam = `, content="""${parsed.data}"""`;
    }
  }

  lines.push(`        response = await client.request(`);
  lines.push(`            "${parsed.method}",`);
  lines.push(`            "${parsed.url}"${headersParam}${dataParam}`);
  lines.push(`        )`);
  lines.push('        print("Status:", response.status_code)');
  lines.push('        print(response.json())');
  lines.push('');
  lines.push('asyncio.run(main())');

  return lines.join('\n');
}

export function generateGoCode(parsed: CurlParseResult): string {
  const bodyInit = parsed.data
    ? `payload := strings.NewReader(\`${parsed.data}\`)
\treq, err := http.NewRequest("${parsed.method}", "${parsed.url}", payload)`
    : `\treq, err := http.NewRequest("${parsed.method}", "${parsed.url}", nil)`;

  const headersCode = Object.entries(parsed.headers)
    .map(([k, v]) => `\treq.Header.Add("${k}", "${v}")`)
    .join('\n');

  return `// Go (net/http standard library)
package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"strings"
)

func main() {
\tclient := &http.Client{}
${bodyInit}
\tif err != nil {
\t\tpanic(err)
\t}

${headersCode}

\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbodyText, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}

\tfmt.Printf("%s\\n", bodyText)
}`;
}

export function generateBeautifiedCurl(parsed: CurlParseResult): string {
  const parts: string[] = [`curl --request ${parsed.method} '${parsed.url}'`];

  Object.entries(parsed.headers).forEach(([k, v]) => {
    parts.push(`  --header '${k}: ${v}'`);
  });

  if (parsed.auth) {
    parts.push(`  --user '${parsed.auth.user}:${parsed.auth.pass}'`);
  }

  if (parsed.data) {
    try {
      const obj = JSON.parse(parsed.data);
      const jsonStr = JSON.stringify(obj, null, 2);
      parts.push(`  --data-raw '${jsonStr.replace(/'/g, "\\'")}'`);
    } catch {
      parts.push(`  --data-raw '${parsed.data.replace(/'/g, "\\'")}'`);
    }
  }

  return parts.join(' \\\n');
}

export function reconstructCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  data?: string
): string {
  const parts: string[] = [`curl -X ${method.toUpperCase()} '${url || 'https://api.example.com'}'`];

  Object.entries(headers).forEach(([k, v]) => {
    if (k && v) {
      parts.push(`  -H '${k}: ${v}'`);
    }
  });

  if (data && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    try {
      const obj = JSON.parse(data);
      const jsonStr = JSON.stringify(obj, null, 2);
      parts.push(`  --data-raw '${jsonStr.replace(/'/g, "\\'")}'`);
    } catch {
      parts.push(`  --data-raw '${data.replace(/'/g, "\\'")}'`);
    }
  }

  return parts.join(' \\\n');
}

export const CURL_PRESETS = [
  {
    name: 'GitHub Repo Info (GET)',
    curl: `curl -X GET "https://api.github.com/repos/google/genai" \\
  -H "Accept: application/vnd.github.v3+json" \\
  -H "User-Agent: Parso-Client/1.0"`,
  },
  {
    name: 'JSONPlaceholder Post (GET)',
    curl: `curl -X GET "https://jsonplaceholder.typicode.com/posts/1" \\
  -H "Accept: application/json"`,
  },
  {
    name: 'Create Resource (POST JSON)',
    curl: `curl -X POST "https://jsonplaceholder.typicode.com/posts" \\
  -H "Content-Type: application/json; charset=UTF-8" \\
  --data-raw '{"title":"Parso API Client","body":"Zero-latency developer suite testing","userId":42}'`,
  },
  {
    name: 'HttpBin Inspect Headers (GET)',
    curl: `curl -X GET "https://httpbin.org/headers" \\
  -H "X-Custom-Client: Parso-DevSuite" \\
  -H "Accept: application/json"`,
  },
  {
    name: 'Update Resource (PUT)',
    curl: `curl -X PUT "https://jsonplaceholder.typicode.com/posts/1" \\
  -H "Content-Type: application/json; charset=UTF-8" \\
  --data-raw '{"id":1,"title":"Updated with Parso","body":"Fast cURL execution test","userId":1}'`,
  },
  {
    name: 'Delete Resource (DELETE)',
    curl: `curl -X DELETE "https://jsonplaceholder.typicode.com/posts/1"`,
  },
];
