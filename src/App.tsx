import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTool } from './types';
import { Header } from './components/Header';
import { JwtDebugger } from './components/JwtDebugger';
import { CronVisualizer } from './components/CronVisualizer';
import { JsonStudio } from './components/JsonStudio';
import { RegexTester } from './components/RegexTester';
import { CurlExecutor } from './components/CurlExecutor';
import { QuickBase64Modal } from './components/QuickBase64Modal';
import {
  getToolFromPath,
  getPathFromTool,
  updateMetaForRoute,
} from './utils/router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Zap,
  Terminal,
  Clock,
  Sparkles,
  Command,
} from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(() => {
    if (typeof window !== 'undefined') {
      return getToolFromPath(window.location.pathname);
    }
    return 'jwt';
  });
  const [isBase64Open, setIsBase64Open] = useState<boolean>(false);

  // Navigate handler that synchronizes URL and document title/meta
  const navigateToTool = useCallback((tool: ActiveTool, replace = false) => {
    setActiveTool(tool);
    const targetPath = getPathFromTool(tool);

    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ tool }, '', targetPath);
      } else {
        window.history.pushState({ tool }, '', targetPath);
      }
    }
    updateMetaForRoute(tool);
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    // Set initial meta tags on load
    updateMetaForRoute(activeTool);

    // If initial path was '/' or unrecognized, normalize URL to current tool route
    const currentPath = window.location.pathname;
    const expectedPath = getPathFromTool(activeTool);
    if (currentPath === '/' || currentPath === '') {
      window.history.replaceState({ tool: activeTool }, '', expectedPath);
    }

    const handlePopState = () => {
      const toolFromUrl = getToolFromPath(window.location.pathname);
      setActiveTool(toolFromUrl);
      updateMetaForRoute(toolFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTool]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.key === '1') navigateToTool('jwt');
      if (e.key === '2') navigateToTool('json');
      if (e.key === '3') navigateToTool('cron');
      if (e.key === '4') navigateToTool('regex');
      if (e.key === '5') navigateToTool('curl');
      if (e.key === 'b' || e.key === 'B') setIsBase64Open(true);
      if (e.key === 'Escape') setIsBase64Open(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToTool]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        activeTool={activeTool}
        onNavigate={navigateToTool}
        onOpenBase64Modal={() => setIsBase64Open(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {activeTool === 'jwt' && <JwtDebugger />}
            {activeTool === 'json' && <JsonStudio />}
            {activeTool === 'cron' && <CronVisualizer />}
            {activeTool === 'regex' && <RegexTester />}
            {activeTool === 'curl' && <CurlExecutor />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modern Developer Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-3 px-4 sm:px-6 mt-auto text-xs text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-medium">Parso Developer Suite</span>
            <span>—</span>
            <span className="text-slate-400">Zero spam, zero latency, 100% client-side privacy</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 font-mono text-[11px] text-slate-400">
              <a
                href="/jwt"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTool('jwt');
                }}
                className={`hover:text-slate-200 transition flex items-center space-x-1 ${
                  activeTool === 'jwt' ? 'text-indigo-400 font-semibold' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">1</span>
                <span>/jwt</span>
              </a>

              <a
                href="/json-diff"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTool('json');
                }}
                className={`hover:text-slate-200 transition flex items-center space-x-1 ${
                  activeTool === 'json' ? 'text-indigo-400 font-semibold' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">2</span>
                <span>/json-diff</span>
              </a>

              <a
                href="/cron"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTool('cron');
                }}
                className={`hover:text-slate-200 transition flex items-center space-x-1 ${
                  activeTool === 'cron' ? 'text-indigo-400 font-semibold' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">3</span>
                <span>/cron</span>
              </a>

              <a
                href="/regex"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTool('regex');
                }}
                className={`hover:text-slate-200 transition flex items-center space-x-1 ${
                  activeTool === 'regex' ? 'text-indigo-400 font-semibold' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">4</span>
                <span>/regex</span>
              </a>

              <a
                href="/curl"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToTool('curl');
                }}
                className={`hover:text-slate-200 transition flex items-center space-x-1 ${
                  activeTool === 'curl' ? 'text-indigo-400 font-semibold' : ''
                }`}
              >
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">5</span>
                <span>/curl</span>
              </a>
            </div>

            <button
              onClick={() => setIsBase64Open(true)}
              className="hover:text-slate-300 transition underline underline-offset-2"
            >
              Base64 / URL
            </button>
          </div>
        </div>
      </footer>

      {/* Quick Base64 Modal */}
      <QuickBase64Modal
        isOpen={isBase64Open}
        onClose={() => setIsBase64Open(false)}
      />
    </div>
  );
}
