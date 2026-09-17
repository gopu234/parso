import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  parseCurl,
  executeCurlRequest,
  reconstructCurlCommand,
  generateFetchCode,
  generateAxiosCode,
  generatePythonRequestsCode,
  generatePythonHttpxCode,
  generateGoCode,
  generateBeautifiedCurl,
  CURL_PRESETS,
} from '../utils/curl';
import { CurlParseResult, CurlExecutionResult, CurlHistoryItem, SavedCurlRequest } from '../types';
import {
  Play,
  Send,
  Loader2,
  Copy,
  Check,
  Code2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  Shield,
  Globe,
  RotateCcw,
  Sparkles,
  Download,
  Search,
  ChevronDown,
  Terminal,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  PlayCircle,
  Folder,
  GripVertical,
} from 'lucide-react';

interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  POST: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  PUT: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  DELETE: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  PATCH: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  HEAD: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  OPTIONS: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export const CurlExecutor: React.FC = () => {
  // Primary request configuration
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [useProxy, setUseProxy] = useState<boolean>(true);

  // Active view tabs
  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'curl' | 'code' | 'saved'>('curl');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [codeLang, setCodeLang] = useState<'fetch' | 'axios' | 'python' | 'httpx' | 'go' | 'curl'>('fetch');

  // Key-value builders
  const [headers, setHeaders] = useState<KeyValueRow[]>([
    { id: '1', key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [queryParams, setQueryParams] = useState<KeyValueRow[]>([]);
  const [bodyType, setBodyType] = useState<'json' | 'raw' | 'urlencoded' | 'none'>('json');
  const [bodyContent, setBodyContent] = useState<string>('');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic'>('none');
  const [bearerToken, setBearerToken] = useState<string>('');
  const [basicAuthUser, setBasicAuthUser] = useState<string>('');
  const [basicAuthPass, setBasicAuthPass] = useState<string>('');

  // Raw cURL input state (bi-directional sync)
  const [rawCurl, setRawCurl] = useState<string>(
    `curl -X GET "https://jsonplaceholder.typicode.com/posts/1" \\\n  -H "Accept: application/json"`
  );

  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<CurlExecutionResult | null>(null);
  const [history, setHistory] = useState<CurlHistoryItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [responseSearch, setResponseSearch] = useState<string>('');

  // Saved Requests & Collections state
  const [savedRequests, setSavedRequests] = useState<SavedCurlRequest[]>(() => {
    try {
      const stored = localStorage.getItem('curlexecutor_saved_requests');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load saved requests from localStorage', e);
    }
    return [
      {
        id: 'default-jsonplaceholder',
        name: 'Get Post (JSONPlaceholder)',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        headers: { Accept: 'application/json' },
        curlCommand: `curl -X GET "https://jsonplaceholder.typicode.com/posts/1" \\\n  -H "Accept: application/json"`,
        createdAt: new Date().toISOString(),
        tags: ['Example', 'Testing'],
      },
      {
        id: 'default-create-user',
        name: 'Create User (Reqres API)',
        method: 'POST',
        url: 'https://reqres.in/api/users',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ name: 'morpheus', job: 'leader' }, null, 2),
        curlCommand: `curl -X POST "https://reqres.in/api/users" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"morpheus","job":"leader"}'`,
        createdAt: new Date().toISOString(),
        tags: ['REST', 'POST'],
      },
      {
        id: 'default-httpbin-headers',
        name: 'Echo Headers (HTTPBin)',
        method: 'GET',
        url: 'https://httpbin.org/headers',
        headers: { 'User-Agent': 'CurlExecutor/1.0', Accept: 'application/json' },
        curlCommand: `curl -X GET "https://httpbin.org/headers" \\\n  -H "User-Agent: CurlExecutor/1.0" \\\n  -H "Accept: application/json"`,
        createdAt: new Date().toISOString(),
        tags: ['Diagnostics'],
      },
    ];
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveRequestName, setSaveRequestName] = useState<string>('');
  const [saveRequestTags, setSaveRequestTags] = useState<string>('');
  const [savedFilterTag, setSavedFilterTag] = useState<string>('all');
  const [savedSearchQuery, setSavedSearchQuery] = useState<string>('');
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Split pane adjustable width state (default 58% left to fit all tabs without scrollbar, min 25%, max 75%)
  const DEFAULT_SPLIT_RATIO = 58;
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('curlexecutor_split_ratio_v2');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 25 && val <= 75) return val;
      }
    } catch {}
    return DEFAULT_SPLIT_RATIO;
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [isLgScreen, setIsLgScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 1024;
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const update = (e: MediaQueryListEvent | MediaQueryList) => setIsLgScreen(e.matches);
    update(media);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('curlexecutor_split_ratio_v2', splitRatio.toString());
    } catch {}
  }, [splitRatio]);

  // Parse raw cURL
  const parsedCurl = useMemo(() => {
    return parseCurl(rawCurl);
  }, [rawCurl]);

  // Sync from raw cURL to visual builder
  const syncFromCurl = (parsed: CurlParseResult) => {
    if (!parsed.isValid) return;

    setMethod((HTTP_METHODS.includes(parsed.method as any) ? parsed.method : 'GET') as HttpMethod);
    setUrl(parsed.url || '');

    // Extract query params from URL
    try {
      const parsedUrl = new URL(parsed.url);
      const rows: KeyValueRow[] = [];
      let i = 0;
      parsedUrl.searchParams.forEach((value, key) => {
        rows.push({ id: String(++i), key, value, enabled: true });
      });
      setQueryParams(rows);
    } catch {}

    // Extract headers
    const newHeaders: KeyValueRow[] = Object.entries(parsed.headers).map(([k, v], idx) => ({
      id: String(idx + 1),
      key: k,
      value: v,
      enabled: true,
    }));
    setHeaders(newHeaders);

    // Extract Auth
    if (parsed.auth) {
      setAuthType('basic');
      setBasicAuthUser(parsed.auth.user);
      setBasicAuthPass(parsed.auth.pass);
    } else if (parsed.headers['Authorization']?.startsWith('Bearer ')) {
      setAuthType('bearer');
      setBearerToken(parsed.headers['Authorization'].slice(7));
    }

    // Extract Body
    if (parsed.data) {
      setBodyContent(parsed.data);
      try {
        JSON.parse(parsed.data);
        setBodyType('json');
      } catch {
        setBodyType('raw');
      }
    } else {
      setBodyContent('');
      setBodyType('none');
    }
  };

  // Build current active request structure
  const currentRequest = useMemo((): CurlParseResult => {
    const activeHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        activeHeaders[h.key.trim()] = h.value;
      }
    });

    if (authType === 'bearer' && bearerToken.trim()) {
      activeHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`;
    }

    // Update query params in URL
    let fullUrl = url.trim();
    if (queryParams.length > 0) {
      try {
        const urlObj = new URL(fullUrl.startsWith('http') ? fullUrl : `https://${fullUrl}`);
        queryParams.forEach((q) => {
          if (q.enabled && q.key.trim()) {
            urlObj.searchParams.set(q.key.trim(), q.value);
          }
        });
        fullUrl = urlObj.toString();
      } catch {}
    }

    let auth;
    if (authType === 'basic' && (basicAuthUser || basicAuthPass)) {
      auth = { user: basicAuthUser, pass: basicAuthPass };
    }

    return {
      method,
      url: fullUrl,
      headers: activeHeaders,
      data: bodyType !== 'none' && bodyContent ? bodyContent : undefined,
      auth,
      cookies: {},
      isValid: Boolean(fullUrl),
    };
  }, [method, url, queryParams, headers, authType, bearerToken, basicAuthUser, basicAuthPass, bodyType, bodyContent]);

  // Sync visual builder changes back to cURL command when in visual mode
  const syncToCurl = () => {
    const cmd = reconstructCurlCommand(
      currentRequest.method,
      currentRequest.url,
      currentRequest.headers,
      currentRequest.data
    );
    setRawCurl(cmd);
  };

  // Execute API Request
  const handleExecute = async () => {
    if (!url.trim()) return;

    setIsExecuting(true);
    const executePayload = requestTab === 'curl' && parsedCurl.isValid ? parsedCurl : currentRequest;

    try {
      const result = await executeCurlRequest(executePayload, useProxy);
      setExecutionResult(result);

      // Add to session history
      const historyItem: CurlHistoryItem = {
        id: Math.random().toString(36).slice(2, 9),
        method: executePayload.method,
        url: executePayload.url,
        timestamp: new Date().toLocaleTimeString(),
        status: result.status,
        durationMs: result.durationMs,
        curlCommand: reconstructCurlCommand(
          executePayload.method,
          executePayload.url,
          executePayload.headers,
          executePayload.data
        ),
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 14)]);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        status: 0,
        statusText: 'Execution Error',
        headers: {},
        body: err.message || 'Failed to send request',
        isJson: false,
        durationMs: 0,
        sizeBytes: 0,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard shortcut (⌘+Enter / Ctrl+Enter) to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [url, currentRequest, parsedCurl, requestTab, useProxy]);

  // Drag handlers for vertical splitter between Request and Response panels
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(rawPercent, 25), 75);
      setSplitRatio(clamped);
    };

    const onMouseUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSplitterTouchStart = (e: React.TouchEvent) => {
    setIsDraggingSplitter(true);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (!splitContainerRef.current || !moveEvent.touches[0]) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawPercent = ((moveEvent.touches[0].clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(Math.max(rawPercent, 25), 75);
      setSplitRatio(clamped);
    };

    const onTouchEnd = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleSplitterDoubleClick = () => {
    setSplitRatio(DEFAULT_SPLIT_RATIO);
  };

  // Persist saved requests to localStorage
  const persistSavedRequests = (items: SavedCurlRequest[]) => {
    setSavedRequests(items);
    try {
      localStorage.setItem('curlexecutor_saved_requests', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist saved requests', e);
    }
  };

  // Open save modal with default prefilled name
  const handleOpenSaveModal = () => {
    const defaultName = `${method} ${url.replace(/^https?:\/\//, '').split('?')[0].slice(0, 32)}`;
    setSaveRequestName(defaultName);
    setSaveRequestTags('api');
    setIsSaveModalOpen(true);
  };

  // Save current request state
  const handleSaveCurrentRequest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeCurl = requestTab === 'curl' && parsedCurl.isValid
      ? rawCurl
      : reconstructCurlCommand(currentRequest.method, currentRequest.url, currentRequest.headers, currentRequest.data);

    const activeHeaders: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      activeHeaders[h.key] = h.value;
    });

    const tagsArray = saveRequestTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newSaved: SavedCurlRequest = {
      id: Math.random().toString(36).slice(2, 11),
      name: saveRequestName.trim() || `${method} Request`,
      method: method,
      url: url,
      headers: activeHeaders,
      data: bodyType !== 'none' && bodyContent ? bodyContent : undefined,
      curlCommand: activeCurl,
      createdAt: new Date().toISOString(),
      tags: tagsArray.length > 0 ? tagsArray : ['General'],
    };

    const updated = [newSaved, ...savedRequests];
    persistSavedRequests(updated);
    setIsSaveModalOpen(false);
    setSaveNotification(`Saved "${newSaved.name}" successfully!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  // Delete saved request
  const handleDeleteSavedRequest = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = savedRequests.filter((req) => req.id !== id);
    persistSavedRequests(updated);
  };

  // Load a saved request into the builder
  const handleLoadSavedRequest = (req: SavedCurlRequest) => {
    setRawCurl(req.curlCommand);
    const parsed = parseCurl(req.curlCommand);
    syncFromCurl(parsed);
    setSaveNotification(`Loaded "${req.name}"`);
    setTimeout(() => setSaveNotification(null), 2500);
  };

  // Load & immediately rerun a saved request
  const handleRerunSavedRequest = async (req: SavedCurlRequest, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleLoadSavedRequest(req);
    setIsExecuting(true);
    try {
      const parsed = parseCurl(req.curlCommand);
      const payload: CurlParseResult = parsed.isValid
        ? parsed
        : {
            isValid: true,
            method: req.method,
            url: req.url,
            headers: req.headers,
            data: req.data,
            cookies: {},
          };
      const result = await executeCurlRequest(payload, useProxy);
      setExecutionResult(result);
      const historyItem: CurlHistoryItem = {
        id: Math.random().toString(36).slice(2, 9),
        method: req.method,
        url: req.url,
        timestamp: new Date().toLocaleTimeString(),
        status: result.status,
        durationMs: result.durationMs,
        curlCommand: req.curlCommand,
      };
      setHistory((prev) => [historyItem, ...prev.slice(0, 14)]);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        status: 0,
        statusText: 'Execution Error',
        headers: {},
        body: err.message || 'Failed to rerun request',
        isJson: false,
        durationMs: 0,
        sizeBytes: 0,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Download response
  const handleDownloadResponse = () => {
    if (!executionResult) return;
    const blob = new Blob([executionResult.body], {
      type: executionResult.isJson ? 'application/json' : 'text/plain',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `response-${Date.now()}.${executionResult.isJson ? 'json' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  // Prettify JSON body
  const handlePrettifyBody = () => {
    try {
      const parsed = JSON.parse(bodyContent);
      setBodyContent(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore
    }
  };

  // Load preset
  const loadPreset = (preset: typeof CURL_PRESETS[0]) => {
    setRawCurl(preset.curl);
    const parsed = parseCurl(preset.curl);
    syncFromCurl(parsed);
  };

  // Generated code for active request
  const generatedCode = useMemo(() => {
    const req = requestTab === 'curl' && parsedCurl.isValid ? parsedCurl : currentRequest;
    switch (codeLang) {
      case 'fetch':
        return generateFetchCode(req);
      case 'axios':
        return generateAxiosCode(req);
      case 'python':
        return generatePythonRequestsCode(req);
      case 'httpx':
        return generatePythonHttpxCode(req);
      case 'go':
        return generateGoCode(req);
      case 'curl':
        return generateBeautifiedCurl(req);
      default:
        return '';
    }
  }, [codeLang, currentRequest, parsedCurl, requestTab]);

  return (
    <div className="space-y-6">
      {/* Main Request Command Bar (Method + URL + Engine Mode + Execute) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Method Selector */}
          <div className="relative shrink-0">
            <select
              value={method}
              onChange={(e) => {
                const newMethod = e.target.value as HttpMethod;
                setMethod(newMethod);
                const updated = { ...currentRequest, method: newMethod };
                setRawCurl(reconstructCurlCommand(newMethod, url, updated.headers, updated.data));
              }}
              className={`w-32 px-3 py-2.5 rounded-lg font-mono font-bold text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${METHOD_COLORS[method].bg} ${METHOD_COLORS[method].text} ${METHOD_COLORS[method].border}`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
          </div>

          {/* URL Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                const updated = { ...currentRequest, url: e.target.value };
                setRawCurl(reconstructCurlCommand(method, e.target.value, updated.headers, updated.data));
              }}
              placeholder="https://api.example.com/v1/resource"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Execution Mode Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 shrink-0 text-xs">
            <button
              onClick={() => setUseProxy(true)}
              title="Executes request via server proxy to completely bypass CORS and allow restricted headers"
              className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
                useProxy
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Proxy Mode (Bypass CORS)</span>
            </button>
            <button
              onClick={() => setUseProxy(false)}
              title="Executes direct fetch from your browser (subject to target server CORS)"
              className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition ${
                !useProxy
                  ? 'bg-slate-800 text-slate-200 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Direct Browser</span>
            </button>
          </div>

          {/* Save Request Button */}
          <button
            id="btn-save-request"
            onClick={handleOpenSaveModal}
            disabled={!url.trim()}
            title="Save request to rerun later"
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <BookmarkPlus className="w-4 h-4 text-amber-400" />
            <span>Save</span>
          </button>

          {/* Send / Execute Button */}
          <button
            id="btn-execute-curl"
            onClick={handleExecute}
            disabled={isExecuting || !url.trim()}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Send Request</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-black/20 text-white/80 font-mono">
                  ⌘↵
                </span>
              </>
            )}
          </button>
        </div>

        {/* Save confirmation toast banner */}
        {saveNotification && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-xs text-indigo-200 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveNotification}</span>
            </div>
            <button
              onClick={() => setRequestTab('saved' as any)}
              className="text-[11px] underline text-indigo-300 hover:text-indigo-100 font-medium ml-3"
            >
              View Saved Requests →
            </button>
          </div>
        )}

        {/* Micro status bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${useProxy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{useProxy ? 'Server Proxy Active (Any API / Any Domain)' : 'Browser Direct (Requires CORS)'}</span>
            </span>
            <span>•</span>
            <span>{Object.keys(currentRequest.headers).length} headers configured</span>
          </div>

          {history.length > 0 && (
            <div className="flex items-center space-x-1 text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{history.length} requests in history</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Container: Request Builder vs Response Inspector with Interactive Draggable Splitter */}
      <div
        ref={splitContainerRef}
        className={`flex flex-col lg:flex-row items-stretch gap-0 relative ${
          isDraggingSplitter ? 'select-none' : ''
        }`}
      >
        {/* Left Column: Request Configuration */}
        <div
          style={
            isLgScreen
              ? {
                  flex: `0 0 calc(${splitRatio}% - 10px)`,
                  width: `calc(${splitRatio}% - 10px)`,
                  maxWidth: `calc(${splitRatio}% - 10px)`,
                  minWidth: '280px',
                }
              : { width: '100%' }
          }
          className="w-full bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-4 shadow-lg min-w-0"
        >
          {/* Request Sub-Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-2 min-w-0">
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
              {[
                { id: 'curl', label: 'Raw cURL', icon: <Terminal className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'params', label: `Params (${queryParams.length})` },
                { id: 'headers', label: `Headers (${headers.length})` },
                { id: 'body', label: `Body ${bodyType !== 'none' ? '•' : ''}` },
                { id: 'auth', label: 'Auth' },
                { id: 'code', label: 'Code Export', icon: <Code2 className="w-3.5 h-3.5 shrink-0" /> },
                { id: 'saved', label: `Saved (${savedRequests.length})`, icon: <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setRequestTab(tab.id as any);
                    if (tab.id !== 'curl') syncFromCurl(parsedCurl);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 whitespace-nowrap shrink-0 transition ${
                    requestTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>

            {requestTab === 'curl' && (
              <button
                onClick={() => {
                  syncFromCurl(parsedCurl);
                  setRequestTab('headers');
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition whitespace-nowrap shrink-0 ml-1.5"
              >
                Edit Visually →
              </button>
            )}
          </div>

          {/* TAB 1: Raw cURL */}
          {requestTab === 'curl' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Paste any cURL command from Chrome DevTools or docs:</span>
                <button
                  onClick={() => handleCopy(rawCurl, 'curl-raw')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 transition"
                >
                  {copiedKey === 'curl-raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy cURL</span>
                </button>
              </div>

              <textarea
                value={rawCurl}
                onChange={(e) => {
                  setRawCurl(e.target.value);
                  const p = parseCurl(e.target.value);
                  if (p.isValid) {
                    setMethod((HTTP_METHODS.includes(p.method as any) ? p.method : 'GET') as HttpMethod);
                    setUrl(p.url);
                  }
                }}
                rows={14}
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                placeholder="curl -X POST https://api.example.com/v1 -H 'Content-Type: application/json' -d '...'"
              />

              {parsedCurl.error && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parsedCurl.error}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Query Params */}
          {requestTab === 'params' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Query Parameters (appended to URL query string)</span>
                <button
                  onClick={() =>
                    setQueryParams((prev) => [
                      ...prev,
                      { id: Math.random().toString(36).slice(2, 7), key: '', value: '', enabled: true },
                    ])
                  }
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs flex items-center space-x-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Param</span>
                </button>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[360px]">
                {queryParams.map((row) => (
                  <div key={row.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => {
                        setQueryParams((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r))
                        );
                        syncToCurl();
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                    />
                    <input
                      type="text"
                      placeholder="key"
                      value={row.key}
                      onChange={(e) => {
                        setQueryParams((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r))
                        );
                        syncToCurl();
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="value"
                      value={row.value}
                      onChange={(e) => {
                        setQueryParams((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r))
                        );
                        syncToCurl();
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        setQueryParams((prev) => prev.filter((r) => r.id !== row.id));
                        syncToCurl();
                      }}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {queryParams.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No query parameters configured yet. Click "Add Param" to append URL query keys.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Headers */}
          {requestTab === 'headers' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Request Headers</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setHeaders((prev) => [
                        ...prev,
                        { id: Math.random().toString(36).slice(2, 7), key: 'Content-Type', value: 'application/json', enabled: true },
                      ])
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] border border-slate-700"
                  >
                    + JSON Header
                  </button>
                  <button
                    onClick={() =>
                      setHeaders((prev) => [
                        ...prev,
                        { id: Math.random().toString(36).slice(2, 7), key: '', value: '', enabled: true },
                      ])
                    }
                    className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Header</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[360px]">
                {headers.map((row) => (
                  <div key={row.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => {
                        setHeaders((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, enabled: e.target.checked } : r))
                        );
                        syncToCurl();
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                    />
                    <input
                      type="text"
                      placeholder="Header Name (e.g. Authorization)"
                      value={row.key}
                      onChange={(e) => {
                        setHeaders((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r))
                        );
                        syncToCurl();
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={row.value}
                      onChange={(e) => {
                        setHeaders((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r))
                        );
                        syncToCurl();
                      }}
                      className="flex-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => {
                        setHeaders((prev) => prev.filter((r) => r.id !== row.id));
                        syncToCurl();
                      }}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Body */}
          {requestTab === 'body' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {(['none', 'json', 'raw', 'urlencoded'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setBodyType(type)}
                      className={`px-2.5 py-1 rounded text-xs font-medium uppercase transition ${
                        bodyType === type
                          ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {bodyType === 'json' && (
                  <button
                    onClick={handlePrettifyBody}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] border border-slate-700"
                  >
                    Prettify JSON
                  </button>
                )}
              </div>

              {bodyType === 'none' ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  This request does not have a body payload. Select "JSON" or "Raw" above to add payload data.
                </div>
              ) : (
                <textarea
                  value={bodyContent}
                  onChange={(e) => {
                    setBodyContent(e.target.value);
                    syncToCurl();
                  }}
                  rows={14}
                  placeholder={
                    bodyType === 'json'
                      ? '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}'
                      : 'Raw payload text here...'
                  }
                  className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              )}
            </div>
          )}

          {/* TAB 5: Auth */}
          {requestTab === 'auth' && (
            <div className="space-y-4 flex-1">
              <div className="flex space-x-2">
                {(['none', 'bearer', 'basic'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAuthType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                      authType === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t === 'none' ? 'No Auth' : t === 'bearer' ? 'Bearer Token' : 'Basic Auth'}
                  </button>
                ))}
              </div>

              {authType === 'bearer' && (
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="text-xs text-slate-300 font-medium">Bearer Token</label>
                  <input
                    type="password"
                    value={bearerToken}
                    onChange={(e) => {
                      setBearerToken(e.target.value);
                      syncToCurl();
                    }}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500">Automatically added as "Authorization: Bearer &lt;token&gt;"</p>
                </div>
              )}

              {authType === 'basic' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Username</label>
                    <input
                      type="text"
                      value={basicAuthUser}
                      onChange={(e) => {
                        setBasicAuthUser(e.target.value);
                        syncToCurl();
                      }}
                      placeholder="apiKey or username"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Password</label>
                    <input
                      type="password"
                      value={basicAuthPass}
                      onChange={(e) => {
                        setBasicAuthPass(e.target.value);
                        syncToCurl();
                      }}
                      placeholder="secret password"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {authType === 'none' && (
                <div className="py-12 text-center text-xs text-slate-500">
                  No authorization headers configured.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Code Export */}
          {requestTab === 'code' && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex space-x-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'fetch', label: 'JavaScript' },
                    { id: 'axios', label: 'Axios' },
                    { id: 'python', label: 'Python' },
                    { id: 'httpx', label: 'HTTPX' },
                    { id: 'go', label: 'Go' },
                    { id: 'curl', label: 'cURL' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCodeLang(tab.id as any)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                        codeLang === tab.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopy(generatedCode, 'exported-code')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center space-x-1 transition"
                >
                  {copiedKey === 'exported-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'exported-code' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="w-full h-80 bg-slate-950 border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-indigo-200/90 overflow-auto leading-relaxed select-all">
                {generatedCode}
              </pre>
            </div>
          )}

          {/* TAB 7: Saved Requests & Rerun Collection */}
          {requestTab === 'saved' && (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <span>Saved API Requests</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Load back into builder or instantly rerun with one click.
                  </p>
                </div>

                <button
                  onClick={handleOpenSaveModal}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Current Request</span>
                </button>
              </div>

              {/* Search & Tag Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={savedSearchQuery}
                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                    placeholder="Search by name, URL, or method..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {savedSearchQuery && (
                    <button
                      onClick={() => setSavedSearchQuery('')}
                      className="absolute right-2.5 top-2 text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Tag pill filters */}
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => setSavedFilterTag('all')}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition whitespace-nowrap ${
                      savedFilterTag === 'all'
                        ? 'bg-slate-700 text-white font-medium'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({savedRequests.length})
                  </button>
                  {Array.from(new Set(savedRequests.flatMap((r) => r.tags || []))).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSavedFilterTag(tag)}
                      className={`px-2.5 py-1 text-[11px] rounded-md transition whitespace-nowrap ${
                        savedFilterTag === tag
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Saved Requests */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 max-h-[380px]">
                {savedRequests
                  .filter((req) => {
                    const matchesSearch =
                      !savedSearchQuery ||
                      req.name.toLowerCase().includes(savedSearchQuery.toLowerCase()) ||
                      req.url.toLowerCase().includes(savedSearchQuery.toLowerCase()) ||
                      req.method.toLowerCase().includes(savedSearchQuery.toLowerCase());
                    const matchesTag =
                      savedFilterTag === 'all' || (req.tags && req.tags.includes(savedFilterTag));
                    return matchesSearch && matchesTag;
                  })
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                METHOD_COLORS[req.method as HttpMethod]?.text || 'text-slate-300'
                              } ${METHOD_COLORS[req.method as HttpMethod]?.bg || 'bg-slate-800'}`}
                            >
                              {req.method}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate">
                              {req.name}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate mt-1">
                            {req.url}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {/* Rerun Button */}
                          <button
                            onClick={(e) => handleRerunSavedRequest(req, e)}
                            disabled={isExecuting}
                            title="Instantly Rerun this API request"
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1 shadow-sm transition disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Rerun</span>
                          </button>

                          {/* Load into visual builder */}
                          <button
                            onClick={() => handleLoadSavedRequest(req)}
                            title="Load into visual request builder"
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition"
                          >
                            Load
                          </button>

                          {/* Copy cURL */}
                          <button
                            onClick={() => handleCopy(req.curlCommand, `copy-${req.id}`)}
                            title="Copy cURL command"
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                          >
                            {copiedKey === `copy-${req.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDeleteSavedRequest(req.id, e)}
                            title="Delete saved request"
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags & Metadata Footer */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          {req.tags?.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800/80"
                            >
                              #{t}
                            </span>
                          ))}
                          {Object.keys(req.headers || {}).length > 0 && (
                            <span>• {Object.keys(req.headers).length} headers</span>
                          )}
                          {req.data && <span>• Has Payload</span>}
                        </div>
                        <span>Saved {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}

                {savedRequests.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg space-y-2">
                    <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-medium text-slate-300">No saved requests yet</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Click "Save Current Request" above or the "Save" button next to Send Request to store your API calls.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Draggable Vertical Splitter Bar between Request and Response Widgets */}
        <div
          onMouseDown={handleSplitterMouseDown}
          onTouchStart={handleSplitterTouchStart}
          onDoubleClick={handleSplitterDoubleClick}
          title="Drag left or right to adjust width (Double-click to reset 50/50)"
          className="hidden lg:flex w-5 shrink-0 items-center justify-center cursor-col-resize group relative z-10 select-none py-2 px-0.5"
        >
          {/* Vertical divider line */}
          <div
            className={`w-1 h-full rounded-full transition-all duration-150 ${
              isDraggingSplitter
                ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.7)]'
                : 'bg-slate-800/80 group-hover:bg-indigo-500/80'
            }`}
          />
          {/* Draggable grip pill handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded-md border flex items-center justify-center transition-all ${
              isDraggingSplitter
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md scale-110'
                : 'bg-slate-900 border-slate-700 text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-300'
            }`}
          >
            <GripVertical className="w-2.5 h-3.5" />
          </div>
        </div>

        {/* Right Column: Response Inspector */}
        <div
          style={
            isLgScreen
              ? {
                  flex: `0 0 calc(${100 - splitRatio}% - 10px)`,
                  width: `calc(${100 - splitRatio}% - 10px)`,
                  maxWidth: `calc(${100 - splitRatio}% - 10px)`,
                  minWidth: '280px',
                }
              : { width: '100%' }
          }
          className="w-full mt-6 lg:mt-0 bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-4 shadow-lg min-w-0"
        >
          {/* Response Top Bar (Status + Metrics) */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center space-x-2.5 whitespace-nowrap min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                Response
              </h3>

              {executionResult && (
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border ${
                    executionResult.status >= 200 && executionResult.status < 300
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : executionResult.status >= 300 && executionResult.status < 400
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      : executionResult.status >= 400 && executionResult.status < 500
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : executionResult.status >= 500
                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {executionResult.status ? `${executionResult.status} ${executionResult.statusText}` : executionResult.statusText}
                </span>
              )}
            </div>

            {/* Metrics */}
            {executionResult && (
              <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
                <span className="flex items-center space-x-1" title="Roundtrip Latency">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{executionResult.durationMs} ms</span>
                </span>
                <span className="flex items-center space-x-1" title="Payload size">
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                  <span>{(executionResult.sizeBytes / 1024).toFixed(2)} KB</span>
                </span>
              </div>
            )}
          </div>

          {/* Response Tabs (Body vs Headers) */}
          {executionResult && (
            <div className="flex items-center justify-between">
              <div className="flex space-x-1">
                <button
                  onClick={() => setResponseTab('body')}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    responseTab === 'body'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Body ({executionResult.isJson ? 'JSON' : 'Raw'})
                </button>
                <button
                  onClick={() => setResponseTab('headers')}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    responseTab === 'headers'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Headers ({Object.keys(executionResult.headers).length})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleCopy(executionResult.body, 'response-body')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs flex items-center space-x-1 transition"
                  title="Copy Response Body"
                >
                  {copiedKey === 'response-body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleDownloadResponse}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs flex items-center space-x-1 transition"
                  title="Download Response Body"
                >
                  <Download className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}

          {/* Response Viewer Output */}
          <div className="flex-1 min-h-[360px] flex flex-col">
            {isExecuting ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-950 border border-slate-800 rounded-lg p-8">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">
                  Executing {method} {url}...
                </p>
              </div>
            ) : executionResult ? (
              responseTab === 'body' ? (
                <div className="flex-1 flex flex-col space-y-2">
                  {executionResult.error && (
                    <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800 text-rose-300 text-xs space-y-1">
                      <div className="font-semibold flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Execution Diagnostic:</span>
                      </div>
                      <p>{executionResult.error}</p>
                    </div>
                  )}

                  <div className="relative flex-1">
                    <pre className="w-full h-full min-h-[340px] max-h-[480px] bg-slate-950 border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-emerald-300/90 overflow-auto leading-relaxed select-all">
                      {executionResult.isJson && executionResult.parsedJson
                        ? JSON.stringify(executionResult.parsedJson, null, 2)
                        : executionResult.body || '(Empty response body)'}
                    </pre>
                  </div>
                </div>
              ) : (
                /* Headers Table */
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-y-auto max-h-[480px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-2.5 font-semibold">Header</th>
                        <th className="py-2 px-2.5 font-semibold">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {Object.entries(executionResult.headers).map(([key, val]) => (
                        <tr key={key} className="hover:bg-slate-900/50">
                          <td className="py-1.5 px-2.5 text-indigo-300 font-bold align-top select-all">{key}</td>
                          <td className="py-1.5 px-2.5 text-slate-300 break-all select-all">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-950/50 border border-slate-800/60 rounded-lg p-8 text-center min-h-[360px]">
                <Send className="w-8 h-8 text-slate-600" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-300">Ready to execute API request</p>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    Click "Send Request" above or press ⌘+Enter. All HTTP methods, custom headers, and API targets are supported.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Session History Drawer / Mini-List */}
          {history.length > 0 && (
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Recent Executions</span>
                <button
                  onClick={() => setHistory([])}
                  className="text-[10px] text-slate-500 hover:text-slate-400"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setRawCurl(h.curlCommand);
                      const p = parseCurl(h.curlCommand);
                      syncFromCurl(p);
                    }}
                    className="w-full text-left p-2 rounded bg-slate-950 border border-slate-800/70 hover:border-indigo-500/50 flex items-center justify-between text-xs font-mono transition"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          METHOD_COLORS[h.method as HttpMethod]?.text || 'text-slate-300'
                        }`}
                      >
                        {h.method}
                      </span>
                      <span className="text-slate-300 truncate text-[11px]">{h.url}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 shrink-0">
                      {h.status ? (
                        <span
                          className={
                            h.status >= 200 && h.status < 300
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {h.status}
                        </span>
                      ) : null}
                      {h.durationMs ? <span>{h.durationMs}ms</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Request Dialog Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BookmarkPlus className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">Save API Request</h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCurrentRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Request Name
                </label>
                <input
                  type="text"
                  required
                  value={saveRequestName}
                  onChange={(e) => setSaveRequestName(e.target.value)}
                  placeholder="e.g., Get User Details, Refresh Auth Token"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={saveRequestTags}
                  onChange={(e) => setSaveRequestTags(e.target.value)}
                  placeholder="e.g. auth, prod, users"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-mono space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">{method}</span>
                  <span className="text-slate-300 truncate">{url}</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  {Object.keys(currentRequest.headers).length} header(s) •{' '}
                  {bodyType !== 'none' ? 'Payload configured' : 'No body'}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium shadow-md transition"
                >
                  Save Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
