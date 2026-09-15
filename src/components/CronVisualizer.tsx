import React, { useState, useMemo } from 'react';
import { parseCron, CRON_PRESETS } from '../utils/cron';
import {
  Clock,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Play,
  Sliders,
  AlertCircle,
  HelpCircle,
  ListOrdered,
} from 'lucide-react';

export const CronVisualizer: React.FC = () => {
  const [expression, setExpression] = useState<string>('*/15 9-17 * * 1-5');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'builder' | 'ai'>('timeline');

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<{
    cron: string;
    humanDescription: string;
    explanation: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Builder state
  const [builderMinute, setBuilderMinute] = useState<string>('*/15');
  const [builderHour, setBuilderHour] = useState<string>('9-17');
  const [builderDom, setBuilderDom] = useState<string>('*');
  const [builderMonth, setBuilderMonth] = useState<string>('*');
  const [builderDow, setBuilderDow] = useState<string>('1-5');

  const parsed = useMemo(() => parseCron(expression), [expression]);

  const copyCron = () => {
    navigator.clipboard.writeText(expression);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyBuilder = (m = builderMinute, h = builderHour, dom = builderDom, mon = builderMonth, dow = builderDow) => {
    const expr = `${m} ${h} ${dom} ${mon} ${dow}`;
    setExpression(expr);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/generate-utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cron', query: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate cron expression');
      }
      setAiResult(data.data);
      if (data.data?.cron) {
        setExpression(data.data.cron);
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Format relative time helper
  const getRelativeTime = (date: Date) => {
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 60) return `in ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMins = diffMinutes % 60;
    if (diffHours < 24) return `in ${diffHours}h ${remainingMins}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Cron Expression Generator & Visualizer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time human English translation, next 10 upcoming run dates, and interactive builder.
          </p>
        </div>

        {/* Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-slate-400 font-medium">Presets:</span>
          {CRON_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.label}
              onClick={() => setExpression(p.cron)}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition"
              title={p.description}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Expression Input & Human Translation */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="cron-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cron Expression (5-part Unix syntax)
            </label>
            <button
              id="btn-copy-cron"
              onClick={copyCron}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Cron'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              id="cron-input"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="* * * * *"
              className={`w-full bg-slate-950 border text-xl md:text-2xl font-mono text-center tracking-widest py-3.5 px-4 rounded-xl text-slate-100 focus:outline-none transition ${
                parsed.isValid
                  ? 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  : 'border-rose-500 text-rose-300'
              }`}
            />
          </div>
        </div>

        {/* 5-Field Breakdown Pills */}
        <div className="grid grid-cols-5 gap-2 text-center">
          {parsed.fields.map((f, i) => (
            <div
              key={f.name}
              className={`p-2.5 rounded-lg border text-xs font-mono transition ${
                f.hasError
                  ? 'bg-rose-950/30 border-rose-800 text-rose-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{f.name}</div>
              <div className="font-bold text-sm text-indigo-400">{f.value || '*'}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{f.allowed}</div>
            </div>
          ))}
        </div>

        {/* Human Readable Translation Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 ${
            parsed.isValid
              ? 'bg-indigo-950/30 border-indigo-800/60 text-indigo-200'
              : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
          }`}
        >
          {parsed.isValid ? (
            <Clock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
              {parsed.isValid ? 'Plain English Schedule' : 'Syntax Error'}
            </div>
            <div className="text-base font-medium text-slate-100">
              {parsed.isValid ? parsed.humanReadable : parsed.error}
            </div>
          </div>
        </div>
      </div>

      {/* Subtabs: Visual Timeline vs Interactive Builder vs AI Generator */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'timeline'
              ? 'bg-slate-800 text-indigo-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Next 10 Scheduled Runs</span>
        </button>

        <button
          onClick={() => setActiveTab('builder')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'builder'
              ? 'bg-slate-800 text-indigo-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Interactive Schedule Builder</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeTab === 'ai'
              ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Natural Language to Cron (AI)</span>
        </button>
      </div>

      {/* Tab 1: Next 10 Runs Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <ListOrdered className="w-4 h-4 text-indigo-400" />
              <span>Upcoming Execution Dates</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Based on local time</span>
          </div>

          {parsed.nextRuns.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No matching upcoming dates found for this expression. Check syntax.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parsed.nextRuns.map((date, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50 flex items-center justify-center font-mono font-semibold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-mono text-slate-200 font-medium">
                        {date.toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        ISO: {date.toISOString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800">
                    {getRelativeTime(date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Interactive Builder */}
      {activeTab === 'builder' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Minutes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Minute Interval
              </label>
              <select
                value={builderMinute}
                onChange={(e) => {
                  setBuilderMinute(e.target.value);
                  applyBuilder(e.target.value, builderHour, builderDom, builderMonth, builderDow);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="*">Every minute (*)</option>
                <option value="*/5">Every 5 minutes (*/5)</option>
                <option value="*/10">Every 10 minutes (*/10)</option>
                <option value="*/15">Every 15 minutes (*/15)</option>
                <option value="*/30">Every 30 minutes (*/30)</option>
                <option value="0">At the start of the hour (0)</option>
                <option value="0,30">Twice an hour: :00 and :30</option>
              </select>
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hours
              </label>
              <select
                value={builderHour}
                onChange={(e) => {
                  setBuilderHour(e.target.value);
                  applyBuilder(builderMinute, e.target.value, builderDom, builderMonth, builderDow);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="*">Every hour (*)</option>
                <option value="9-17">Working hours (9 AM - 5 PM)</option>
                <option value="0">Midnight (00:00)</option>
                <option value="12">Noon (12:00 PM)</option>
                <option value="*/2">Every 2 hours (*/2)</option>
                <option value="*/6">Every 6 hours (*/6)</option>
                <option value="*/12">Every 12 hours (*/12)</option>
              </select>
            </div>

            {/* Weekdays */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Day of Week
              </label>
              <select
                value={builderDow}
                onChange={(e) => {
                  setBuilderDow(e.target.value);
                  applyBuilder(builderMinute, builderHour, builderDom, builderMonth, e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="*">Every day (*)</option>
                <option value="1-5">Weekdays only (Monday to Friday)</option>
                <option value="0,6">Weekends only (Saturday & Sunday)</option>
                <option value="1">Monday only</option>
                <option value="5">Friday only</option>
                <option value="0">Sunday only</option>
              </select>
            </div>
          </div>

          {/* Quick preset tiles */}
          <div className="pt-4 border-t border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Common Production Presets
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setExpression(p.cron)}
                  className="p-3 text-left rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 transition group"
                >
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                    {p.label}
                  </div>
                  <div className="text-[11px] font-mono text-indigo-400 mt-1">{p.cron}</div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Natural Language to Cron */}
      {activeTab === 'ai' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Convert Plain English to Cron Expression</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Describe when you want your job or script to run in natural language.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
              placeholder="e.g., Every Tuesday and Thursday at 4:30 PM, or every 2 hours on weekdays..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-1.5 transition"
            >
              {aiLoading ? (
                <span>Generating...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Generated Cron:</span>
                <span className="text-base font-mono font-bold text-indigo-400">{aiResult.cron}</span>
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-slate-200">Meaning:</span> {aiResult.humanDescription}
              </div>
              {aiResult.explanation && (
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Explanation:</span> {aiResult.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
