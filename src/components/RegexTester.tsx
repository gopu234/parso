import React, { useState, useMemo } from 'react';
import { testRegexSafely, parseRegexTokens, explainRegexLocally, REGEX_PRESETS } from '../utils/regex';
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
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
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

  // Embedded Explainer state (0ms latency, zero API key required)
  const [aiExplanation, setAiExplanation] = useState<AiRegexExplanation | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

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

  const handleExplainRegex = () => {
    if (!pattern.trim()) return;
    // 100% in-browser semantic AST explanation - zero API key, 0ms latency
    const explanation = explainRegexLocally(pattern, flags, testString);
    setAiExplanation(explanation);
    setShowAiModal(true);
  };

  const loadTestCasesIntoEditor = () => {
    if (!aiExplanation?.testCases) return;
    const { shouldMatch = [], shouldFail = [] } = aiExplanation.testCases;
    const combined = [
      '# Should Match:',
      ...shouldMatch,
      '',
      '# Should Not Match:',
      ...shouldFail,
    ].join('\n');
    setTestString(combined);
    setShowAiModal(false);
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
            Regex Tester & Semantic Explainer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time match highlighting, capture group inspector, visual syntax breakdown, and instant embedded AST analysis.
          </p>
        </div>

        {/* Explain Regex Button (Embedded AST engine) */}
        <button
          id="btn-explain-regex-local"
          onClick={handleExplainRegex}
          className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-md shadow-indigo-500/20"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Explain Regex (Embedded Engine)</span>
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

      {/* Embedded Semantic Explainer Modal */}
      {showAiModal && aiExplanation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    <span>Embedded Semantic Regex Explainer</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Local Engine • 0ms
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Client-side AST parser, security/ReDoS diagnostics, and sample generator. Zero external API needed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pattern Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 flex items-center justify-between">
                <span>/{pattern}/{flags}</span>
                <span className="text-[10px] text-slate-500 font-sans">{aiExplanation.tokens.length} tokens</span>
              </div>

              {/* Summary */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/60 text-indigo-200">
                <div className="font-semibold text-indigo-300 uppercase tracking-wider text-[10px] mb-1">
                  Executive Summary
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{aiExplanation.summary}</p>
              </div>

              {/* Capture Groups / Assertions */}
              {aiExplanation.captureGroups?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Group Constructs & Lookarounds ({aiExplanation.captureGroups.length})
                  </div>
                  <div className="space-y-1.5">
                    {aiExplanation.captureGroups.map((g, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-bold font-mono text-[11px]">{g.group}</span>
                          <code className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono text-[10px]">
                            {g.pattern}
                          </code>
                        </div>
                        <p className="text-slate-400 text-[11px]">{g.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-Generated Test Cases */}
              {aiExplanation.testCases &&
                (aiExplanation.testCases.shouldMatch?.length > 0 ||
                  aiExplanation.testCases.shouldFail?.length > 0) && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Generated Test Cases</span>
                      </div>
                      <button
                        onClick={loadTestCasesIntoEditor}
                        className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-medium transition flex items-center space-x-1"
                      >
                        <span>Load Cases into Tester</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Should Match */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Should Match</span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          {aiExplanation.testCases.shouldMatch.map((val, idx) => (
                            <div key={idx} className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 truncate">
                              {val}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Should Fail */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>Should Not Match</span>
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          {aiExplanation.testCases.shouldFail.map((val, idx) => (
                            <div key={idx} className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 truncate">
                              {val}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Potential Pitfalls & Gotchas */}
              {aiExplanation.potentialPitfalls?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 space-y-1.5">
                  <div className="font-semibold text-amber-300 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Security & Performance Diagnostics</span>
                  </div>
                  <ul className="space-y-1.5 text-amber-200/90 text-[11px]">
                    {aiExplanation.potentialPitfalls.map((p, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Optimizations */}
              {aiExplanation.suggestedOptimizations?.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 space-y-1.5">
                  <div className="font-semibold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Actionable Optimizations</span>
                  </div>
                  <ul className="space-y-1 text-emerald-200/90 text-[11px]">
                    {aiExplanation.suggestedOptimizations.map((opt, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span>{opt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tokens breakdown */}
              {aiExplanation.tokens?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                    Detailed Token Analysis
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {aiExplanation.tokens.map((t, i) => (
                      <div key={i} className="p-1.5 rounded bg-slate-950 border border-slate-800/80 flex items-start space-x-2 font-mono text-[11px]">
                        <span className="text-indigo-400 font-bold shrink-0">{t.part}</span>
                        <span className="text-slate-400 font-sans text-xs">{t.explanation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
