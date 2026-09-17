import React, { useState, useMemo } from 'react';
import { formatJson, minifyJson, computeJsonDiff, validateJsonSchema } from '../utils/jsonDiff';
import {
  FileCode2,
  GitCompare,
  CheckCircle2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

export const JsonStudio: React.FC = () => {
  const [mode, setMode] = useState<'format' | 'diff' | 'schema'>('format');

  // Formatter State
  const defaultJson = JSON.stringify(
    {
      app: 'Parso',
      version: '2.4.0',
      active: true,
      features: ['jwt-debugger', 'cron-generator', 'json-diff', 'regex-ai', 'curl-converter'],
      privacy: {
        clientSideOnly: true,
        zeroLatency: true,
        encryptedInMemory: true,
      },
      stats: {
        monthlyQueries: 8400000,
        averageLatencyMs: 0.1,
      },
    },
    null,
    2
  );

  const [inputJson, setInputJson] = useState<string>(defaultJson);
  const [indentOption, setIndentOption] = useState<number | string>(2);
  const [sortKeys, setSortKeys] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Diff State
  const defaultDiffLeft = JSON.stringify(
    {
      id: 'proj_101',
      title: 'Legacy API Gateway',
      version: 1,
      tier: 'standard',
      rateLimit: 1000,
      tags: ['production', 'us-east'],
      maintainer: {
        name: 'Jordan Lee',
        email: 'jordan@company.internal',
      },
    },
    null,
    2
  );

  const defaultDiffRight = JSON.stringify(
    {
      id: 'proj_101',
      title: 'Cloud Edge Gateway v2',
      version: 2,
      tier: 'enterprise',
      rateLimit: 50000,
      tags: ['production', 'us-east', 'eu-central', 'high-availability'],
      maintainer: {
        name: 'Jordan Lee',
        email: 'jordan.lee@company.internal',
        backup: 'devops-team@company.internal',
      },
      monitoring: {
        metricsEnabled: true,
        alertThreshold: 0.999,
      },
    },
    null,
    2
  );

  const [diffLeft, setDiffLeft] = useState<string>(defaultDiffLeft);
  const [diffRight, setDiffRight] = useState<string>(defaultDiffRight);

  // Schema Validator State
  const defaultSchemaInstance = JSON.stringify(
    {
      userId: 'usr_89201',
      username: 'alex_developer',
      email: 'alex@example.com',
      age: 28,
      roles: ['developer', 'tester'],
      verified: true,
    },
    null,
    2
  );

  const defaultSchemaSpec = JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['userId', 'username', 'email', 'age', 'roles'],
      properties: {
        userId: { type: 'string', pattern: '^usr_[a-zA-Z0-9]+$' },
        username: { type: 'string', minLength: 3, maxLength: 30 },
        email: { type: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        age: { type: 'integer', minimum: 18, maximum: 120 },
        roles: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
        verified: { type: 'boolean' },
      },
    },
    null,
    2
  );

  const [schemaInstance, setSchemaInstance] = useState<string>(defaultSchemaInstance);
  const [schemaSpec, setSchemaSpec] = useState<string>(defaultSchemaSpec);

  // Computed Formatter
  const formattedResult = useMemo(() => {
    return formatJson(inputJson, indentOption, sortKeys);
  }, [inputJson, indentOption, sortKeys]);

  // Computed Diff
  const diffResult = useMemo(() => {
    return computeJsonDiff(diffLeft, diffRight);
  }, [diffLeft, diffRight]);

  // Computed Schema Validation
  const schemaValidation = useMemo(() => {
    return validateJsonSchema(schemaInstance, schemaSpec);
  }, [schemaInstance, schemaSpec]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadJson = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            JSON Formatter / Diff / Schema Validator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            100% client-side privacy. Zero data leaves your browser. Instant syntax highlighting and recursive structural diff.
          </p>
        </div>

        {/* Submode Switcher */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMode('format')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              mode === 'format' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Formatter & Minifier</span>
          </button>
          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              mode === 'diff' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Visual Diff</span>
          </button>
          <button
            onClick={() => setMode('schema')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center space-x-1.5 ${
              mode === 'schema' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Schema Validator</span>
          </button>
        </div>
      </div>

      {/* MODE 1: FORMATTER & MINIFIER */}
      {mode === 'format' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-medium">Indentation:</span>
                <select
                  value={indentOption}
                  onChange={(e) => setIndentOption(e.target.value === 'tab' ? 'tab' : Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value="tab">Tabs</option>
                </select>
              </div>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>Sort Keys Alphabetically</span>
              </label>

              <button
                onClick={() => {
                  const m = minifyJson(inputJson);
                  if (!m.error) setInputJson(m.minified);
                }}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                Minify JSON
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {formattedResult.stats && (
                <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-400 font-mono pr-2 border-r border-slate-800">
                  <span>{formattedResult.stats.bytes} bytes</span>
                  <span>{formattedResult.stats.lines} lines</span>
                  <span>{formattedResult.stats.keysCount} keys</span>
                </div>
              )}

              <button
                id="btn-copy-formatted-json"
                onClick={() => copyToClipboard(formattedResult.formatted, 'format')}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1"
              >
                {copiedKey === 'format' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'format' ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => downloadJson(formattedResult.formatted, 'formatted.json')}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Error display if invalid JSON */}
          {formattedResult.error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formattedResult.error}</span>
            </div>
          )}

          {/* 2-Column Split: Input on Left, Formatted Output on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Raw Input JSON</span>
                <button
                  onClick={() => setInputJson(defaultJson)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="Paste or write any JSON object or array..."
                rows={16}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Formatted Output
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Real-time preview</span>
              </div>
              <pre className="w-full h-[380px] bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-300/90 overflow-auto leading-relaxed select-all">
                {formattedResult.formatted}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: VISUAL DIFF */}
      {mode === 'diff' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-indigo-400" />
              <span>Deep Structural Comparison</span>
            </div>

            {/* Summary badges */}
            {!diffResult.error && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +{diffResult.diffs.filter((d) => d.type === 'added').length} Added
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  -{diffResult.diffs.filter((d) => d.type === 'removed').length} Removed
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ~{diffResult.diffs.filter((d) => d.type === 'modified').length} Modified
                </span>
              </div>
            )}
          </div>

          {diffResult.error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {diffResult.error}
            </div>
          )}

          {/* 2-Pane Editor for Left vs Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Original Version (A)
              </div>
              <textarea
                value={diffLeft}
                onChange={(e) => setDiffLeft(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Modified Version (B)
              </div>
              <textarea
                value={diffRight}
                onChange={(e) => setDiffRight(e.target.value)}
                rows={12}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Diff Changes Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
              Differences Log ({diffResult.diffs.filter((d) => d.type !== 'unchanged').length} changes)
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {diffResult.diffs.filter((d) => d.type !== 'unchanged').length === 0 ? (
                <div className="text-xs text-emerald-400 p-4 text-center bg-emerald-950/20 rounded-lg border border-emerald-800/40">
                  Documents are structurally identical!
                </div>
              ) : (
                diffResult.diffs
                  .filter((d) => d.type !== 'unchanged')
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs font-mono flex items-start justify-between ${
                        item.type === 'added'
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          : item.type === 'removed'
                          ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                          : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-semibold flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                              item.type === 'added'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.type === 'removed'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span>$.{item.path}</span>
                        </div>

                        <div className="mt-1 flex items-center space-x-2 text-[11px]">
                          {item.type === 'modified' && (
                            <>
                              <span className="text-rose-400 line-through truncate max-w-xs">
                                {JSON.stringify(item.oldValue)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="text-emerald-400 truncate max-w-xs">
                                {JSON.stringify(item.newValue)}
                              </span>
                            </>
                          )}
                          {item.type === 'added' && (
                            <span className="text-emerald-400 truncate max-w-md">
                              {JSON.stringify(item.newValue)}
                            </span>
                          )}
                          {item.type === 'removed' && (
                            <span className="text-rose-400 truncate max-w-md">
                              {JSON.stringify(item.oldValue)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: SCHEMA VALIDATOR */}
      {mode === 'schema' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">JSON Schema Draft-07 Validator</span>
            </div>

            {/* Validation Outcome Pill */}
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 border ${
                schemaValidation.isValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {schemaValidation.isValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Valid JSON Instance</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{schemaValidation.errors.length} Schema Violations Found</span>
                </>
              )}
            </div>
          </div>

          {/* Error Diagnostics List */}
          {schemaValidation.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 space-y-2">
              <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
                Schema Violation Diagnostics:
              </div>
              <div className="space-y-1.5">
                {schemaValidation.errors.map((err, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-rose-200 font-mono">
                    <span className="text-rose-400 font-bold">•</span>
                    <span className="text-rose-300 font-semibold">{err.path}:</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column Split: Data Instance on Left, Schema on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                JSON Data Payload
              </div>
              <textarea
                value={schemaInstance}
                onChange={(e) => setSchemaInstance(e.target.value)}
                rows={16}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
              />
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                JSON Schema Specification
              </div>
              <textarea
                value={schemaSpec}
                onChange={(e) => setSchemaSpec(e.target.value)}
                rows={16}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-indigo-300/90 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
