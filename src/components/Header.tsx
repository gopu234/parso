import React from 'react';
import { ActiveTool } from '../types';
import { getPathFromTool } from '../utils/router';
import {
  KeyRound,
  Clock,
  FileCode2,
  Regex,
  Terminal,
  Binary,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  activeTool: ActiveTool;
  onNavigate: (tool: ActiveTool) => void;
  onOpenBase64Modal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTool,
  onNavigate,
  onOpenBase64Modal,
}) => {
  const tools: Array<{ id: ActiveTool; label: string; icon: React.ReactNode }> = [
    { id: 'jwt', label: 'JWT Debugger', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'json', label: 'JSON Studio & Diff', icon: <FileCode2 className="w-4 h-4" /> },
    { id: 'cron', label: 'Cron Visualizer', icon: <Clock className="w-4 h-4" /> },
    { id: 'regex', label: 'Regex & Explainer', icon: <Regex className="w-4 h-4" /> },
    { id: 'curl', label: 'cURL Executor', icon: <Terminal className="w-4 h-4" /> },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, tool: ActiveTool) => {
    // Let user command-click / middle-click to open new tab naturally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onNavigate(tool);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <a
            href="/jwt"
            onClick={(e) => handleLinkClick(e, 'jwt')}
            className="flex items-center space-x-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white font-mono font-bold shadow-md shadow-indigo-500/20 border border-indigo-400/30 transition">
              {'</>'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-100 text-lg tracking-tight font-mono group-hover:text-white transition">
                  Parso
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-3 h-3 mr-1" />
                  Zero-Latency
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Developer Utilities & Syntax Suite</p>
            </div>
          </a>

          {/* Privacy Indicator Badge */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side In-Memory Processing</span>
          </div>

          {/* Quick Utility Trigger */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-quick-base64"
              onClick={onOpenBase64Modal}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition flex items-center space-x-1.5"
              title="Quick Base64 / URL / Hex Utility"
            >
              <Binary className="w-3.5 h-3.5 text-indigo-400" />
              <span>Base64 / URL</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs with clean URLs */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-2 -mb-px">
          {tools.map((tool) => {
            const isActive = activeTool === tool.id;
            const routePath = getPathFromTool(tool.id);
            return (
              <a
                key={tool.id}
                id={`tab-${tool.id}`}
                href={routePath}
                onClick={(e) => handleLinkClick(e, tool.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>{tool.icon}</span>
                <span>{tool.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
