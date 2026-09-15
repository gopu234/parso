import React, { useState, useMemo } from 'react';
import { testRegexSafely, parseRegexTokens, REGEX_PRESETS } from '../utils/regex';
import { AiRegexExplanation } from '../types';
import {
  Regex,
  Sparkles,
  Play,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Zap,
  Info,
  ChevronRight,
  X,
} from 'lucide-react';

export const RegexTester: React.FC = () => {
  const [pattern, setPattern] = useState<string>(
    'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)'
  );
  const [flags, setFlags] = useState<string>('gi');
  const [testString, setTestString] = useState<string>(
    'Check out our live API docs at https://github.com/google/genai and inspect local dev http://localhost:3000/api/health?v=2 for status.'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI state
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<AiRegexExplanation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // AI Generator state
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState<string>('');
  const [aiGenerateLoading, setAiGenerateLoading] = useState<boolean>(false);

  // Run regex test safely
  const testResult = useMemo(() => {
    return testRegexSafely(pattern, flags, testString);
  }, [pattern, flags, testString]);

  // Parse visual tokens
  const tokens = useMemo(() => {
    return parseRegexTokens(pattern);
  }, [pattern]);

  const toggleFlag = (flagChar: string) => {
    if (flags.includes(flagChar)) {
      setFlags(flags.replace(flagChar, ''));
    } else {
      setFlags(flags + flagChar);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExplainWithAi = async () => {
    if (!pattern.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setShowAiModal(true);

    try {
      const res = await fetch('/api/ai/explain-regex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regex: pattern, flags, testString }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to explain regex');
      }
      setAiExplanation(data.data);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiGeneratePrompt.trim()) return;
    setAiGenerateLoading(true);
    try {
      const res = await fetch('/api/ai/generate-utility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'regex', query: aiGeneratePrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate regex');
      }
      if (data.data?.regex) {
        setPattern(data.data.regex);
        if (data.data.flags) setFlags(data.data.flags);
        if (data.data.testCases?.shouldMatch?.length) {
          setTestString(data.data.testCases.shouldMatch.join('\n'));
        }
      }
    } catch (err: any) {
      alert(`AI Error: ${err.message}`);
    } finally {
      setAiGenerateLoading(false);
    }
  };

  // Highlighted Test String Renderer
  const renderHighlightedText = () => {
    if (!testString) return <span className="text-slate-500">No test text entered</span>;
    if (testResult.matches.length === 0 || testResult.error) {
      return <span>{testString}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    testResult.matches.forEach((m, idx) => {
      // Unmatched prefix
      if (m.index > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>{testString.slice(lastIndex, m.index)}</span>
        );
      }
      // Matched segment
      elements.push(
        <mark
          key={`match-${idx}`}
          className="bg-indigo-500/30 text-indigo-200 border-b-2 border-indigo-400 px-0.5 rounded-sm font-semibold transition"
          title={`Match #${idx + 1}: ${m.match}`}
        >
          {m.match}
        </mark>
      );
      lastIndex = m.endIndex;
    });

    if (lastIndex < testString.length) {
      elements.push(
        <span key="text-end">{testString.slice(lastIndex)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            Regex Tester & AI Explainer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time match highlighting, capture group inspector, visual syntax breakdown, and Gemini AI analysis.
          </p>
        </div>

        {/* Explain with AI Button */}
        <button
          id="btn-explain-regex-ai"
          onClick={handleExplainWithAi}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-md shadow-indigo-500/20"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>Explain Regex with AI</span>
        </button>
      </div>

      {/* Regex Pattern Input & Flags */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <label htmlFor="regex-pattern-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Regular Expression
          </label>

          {/* Preset Picker Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Presets:</span>
            <select
              onChange={(e) => {
                const selected = REGEX_PRESETS.find((p) => p.name === e.target.value);
                if (selected) {
                  setPattern(selected.pattern);
                  setFlags(selected.flags);
                  setTestString(selected.sample);
                }
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">Select regex preset...</option>
              {REGEX_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Big Slash Input */}
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <span className="text-xl font-mono text-slate-500 pl-2 font-bold">/</span>
          <input
            id="regex-pattern-input"
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern without slashes..."
            className="flex-1 bg-transparent border-none font-mono text-sm md:text-base text-indigo-300 focus:outline-none"
          />
          <span className="text-xl font-mono text-slate-500 font-bold">/</span>

          {/* Flags Selector Pills */}
          <div className="flex items-center space-x-1 pr-1 border-l border-slate-800 pl-2">
            {[
              { flag: 'g', label: 'global', desc: 'Find all matches rather than stopping after the first' },
              { flag: 'i', label: 'ignoreCase', desc: 'Case-insensitive matching' },
              { flag: 'm', label: 'multiline', desc: '^ and $ match line starts and ends' },
              { flag: 's', label: 'dotAll', desc: '. matches newline characters' },
              { flag: 'u', label: 'unicode', desc: 'Treat pattern as sequence of Unicode points' },
            ].map(({ flag, desc }) => {
              const active = flags.includes(flag);
              return (
                <button
                  key={flag}
                  onClick={() => toggleFlag(flag)}
                  title={`${flag}: ${desc}`}
                  className={`w-7 h-7 rounded text-xs font-mono font-bold transition flex items-center justify-center ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {flag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance & Error Indicator */}
        <div className="flex items-center justify-between text-xs pt-1">
          {testResult.error ? (
            <div className="text-rose-400 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Regex Compile Error: {testResult.error}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-4 text-slate-400 font-mono text-[11px]">
              <span className="text-emerald-400 font-medium">
                {testResult.matches.length} match{testResult.matches.length === 1 ? '' : 'es'} found
              </span>
              <span className="text-slate-500">
                Evaluation latency: <span className="text-slate-300">{testResult.executionTimeMs} ms</span>
              </span>
            </div>
          )}

          <button
            onClick={() => copyToClipboard(`/${pattern}/${flags}`, 'regex')}
            className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center space-x-1"
          >
            {copiedKey === 'regex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'regex' ? 'Copied' : 'Copy /pattern/flags'}</span>
          </button>
        </div>
      </div>

      {/* Test String & Live Visual Highlighting */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Raw Test Input */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="test-string-input" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Test Text String
            </label>
            <span className="text-[11px] text-slate-500 font-mono">{testString.length} chars</span>
          </div>
          <textarea
            id="test-string-input"
            rows={10}
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Type or paste sample text to test matches against..."
            className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
          />
        </div>

        {/* Right: Real-time Match Visual Highlight */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Real-Time Match Highlights
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Interactive overlay</span>
          </div>
          <div className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-y-auto max-h-60 leading-relaxed whitespace-pre-wrap select-text">
            {renderHighlightedText()}
          </div>
        </div>
      </div>

      {/* Visual Syntax Tree / Token Breakdown */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Visual Syntax Breakdown ({tokens.length} structural elements)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto">
          {tokens.map((tok, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex items-start space-x-2.5 hover:border-slate-700 transition"
            >
              <code
                className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs shrink-0 ${
                  tok.type === 'class'
                    ? 'bg-blue-500/20 text-blue-300'
                    : tok.type === 'quantifier'
                    ? 'bg-amber-500/20 text-amber-300'
                    : tok.type === 'anchor'
                    ? 'bg-rose-500/20 text-rose-300'
                    : tok.type === 'group'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tok.raw}
              </code>
              <span className="text-slate-400 text-[11px] leading-tight">{tok.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Captured Groups Table */}
      {testResult.matches.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Match Inspection Details
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">#</th>
                  <th className="pb-2 font-semibold">Range</th>
                  <th className="pb-2 font-semibold">Full Match</th>
                  <th className="pb-2 font-semibold">Capture Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {testResult.matches.slice(0, 10).map((m, i) => (
                  <tr key={i} className="hover:bg-slate-950/40">
                    <td className="py-2 text-indigo-400 font-bold">{i + 1}</td>
                    <td className="py-2 text-slate-400">{m.index} - {m.endIndex}</td>
                    <td className="py-2 text-emerald-400 font-medium truncate max-w-xs">{m.match}</td>
                    <td className="py-2 text-slate-400">
                      {m.groupArray.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.groupArray.map((grp, gIdx) => (
                            <span key={gIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 text-[10px]">
                              ${gIdx + 1}: {grp || 'undefined'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Explanation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-100">Gemini AI Regex Breakdown</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiLoading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-400">Analyzing regex logic & edge cases with Gemini 3.8 Flash...</p>
              </div>
            )}

            {aiError && (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800 text-rose-300 text-xs">
                {aiError}
              </div>
            )}

            {aiExplanation && !aiLoading && (
              <div className="space-y-4 text-xs">
                {/* Summary */}
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/60 text-indigo-200">
                  <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[10px] mb-1">
                    Summary Overview
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{aiExplanation.summary}</p>
                </div>

                {/* Tokens analysis */}
                {aiExplanation.tokens?.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                      Token-by-Token Logic
                    </div>
                    <div className="space-y-1.5">
                      {aiExplanation.tokens.map((t, i) => (
                        <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-start space-x-2 font-mono">
                          <span className="text-indigo-400 font-bold shrink-0">{t.part}</span>
                          <span className="text-slate-400 font-sans">{t.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Potential Pitfalls & Gotchas */}
                {aiExplanation.potentialPitfalls?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 space-y-1.5">
                    <div className="font-semibold text-amber-300 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Edge Cases & Pitfalls</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-amber-200/90">
                      {aiExplanation.potentialPitfalls.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Optimizations */}
                {aiExplanation.suggestedOptimizations?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-200 space-y-1.5">
                    <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Optimizations & Recommendations</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-emerald-200/90">
                      {aiExplanation.suggestedOptimizations.map((opt, i) => (
                        <li key={i}>{opt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
