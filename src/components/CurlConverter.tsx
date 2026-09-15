import React, { useState, useMemo } from 'react';
import {
  parseCurl,
  generateFetchCode,
  generateAxiosCode,
  generatePythonRequestsCode,
  generatePythonHttpxCode,
  generateGoCode,
  generateBeautifiedCurl,
  CURL_PRESETS,
} from '../utils/curl';
import {
  Terminal,
  Copy,
  Check,
  Code2,
  FileCode,
  ArrowRight,
  ExternalLink,
  Layers,
  AlertCircle,
} from 'lucide-react';

export const CurlConverter: React.FC = () => {
  const defaultCurl = `curl 'https://api.github.com/repos/google/genai/issues?state=open&per_page=5' \\
  -H 'Accept: application/vnd.github+json' \\
  -H 'Authorization: Bearer ghp_sample_token_secret_9988' \\
  -H 'User-Agent: Parso-Client/1.0'`;

  const [curlInput, setCurlInput] = useState<string>(defaultCurl);
  const [activeLang, setActiveLang] = useState<
    'fetch' | 'axios' | 'python' | 'httpx' | 'go' | 'beautified'
  >('fetch');
  const [copied, setCopied] = useState<boolean>(false);

  // Parse cURL
  const parsed = useMemo(() => {
    return parseCurl(curlInput);
  }, [curlInput]);

  // Generated code output
  const generatedCode = useMemo(() => {
    if (!parsed.isValid) return '';
    switch (activeLang) {
      case 'fetch':
        return generateFetchCode(parsed);
      case 'axios':
        return generateAxiosCode(parsed);
      case 'python':
        return generatePythonRequestsCode(parsed);
      case 'httpx':
        return generatePythonHttpxCode(parsed);
      case 'go':
        return generateGoCode(parsed);
      case 'beautified':
        return generateBeautifiedCurl(parsed);
      default:
        return '';
    }
  }, [parsed, activeLang]);

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            cURL to Fetch / Axios / Python Converter
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Instantly convert browser DevTools "Copy as cURL" commands into clean, production-ready code.
          </p>
        </div>

        {/* Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium">DevTools Presets:</span>
          {CURL_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setCurlInput(p.curl)}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Detected Parameters Overview Strip */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span
            className={`px-2.5 py-1 rounded font-mono font-bold uppercase text-xs ${
              parsed.method === 'GET'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : parsed.method === 'POST'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : parsed.method === 'PUT'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {parsed.method}
          </span>
          <span className="font-mono text-slate-300 truncate max-w-sm md:max-w-md" title={parsed.url}>
            {parsed.url || 'No URL specified'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
          <span>{Object.keys(parsed.headers).length} headers</span>
          <span>{parsed.data ? 'Payload included' : 'No body'}</span>
          <span>{parsed.auth ? 'Basic Auth detected' : 'No Auth credentials'}</span>
        </div>
      </div>

      {/* Main 2-Column Split: Input cURL vs Output Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: cURL input (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="curl-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Raw cURL Command</span>
            </label>
            <span className="text-[11px] text-slate-500">Paste from Chrome/Firefox DevTools</span>
          </div>

          <textarea
            id="curl-input"
            rows={16}
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            placeholder="curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '...'"
            className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
          />

          {parsed.error && (
            <div className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parsed.error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Code Generator (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-3">
          {/* Target Language Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex space-x-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'fetch', label: 'JavaScript Fetch' },
                { id: 'axios', label: 'Axios' },
                { id: 'python', label: 'Python (Requests)' },
                { id: 'httpx', label: 'Python (Httpx)' },
                { id: 'go', label: 'Go (net/http)' },
                { id: 'beautified', label: 'Clean cURL' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLang(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                    activeLang === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              id="btn-copy-converted-code"
              onClick={copyCode}
              disabled={!parsed.isValid}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition shrink-0 ml-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Generated Code Display */}
          <div className="relative flex-1">
            <pre className="w-full h-full min-h-[360px] bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-indigo-200/90 overflow-auto leading-relaxed select-all">
              {generatedCode || '// Enter a valid cURL command on the left to see generated code'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
