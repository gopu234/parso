import { ActiveTool } from '../types';

export type RoutePath = '/jwt' | '/json-diff' | '/cron' | '/regex' | '/curl';

export interface RouteConfig {
  path: RoutePath;
  tool: ActiveTool;
  label: string;
  title: string;
  description: string;
  keywords: string;
}

export const ROUTES: Record<string, RouteConfig> = {
  jwt: {
    path: '/jwt',
    tool: 'jwt',
    label: 'JWT Debugger',
    title: 'JWT Debugger & Signature Verifier | Parso',
    description:
      'Zero-latency, client-side JWT debugger and decoder. Inspect headers, payload claims, expiration countdowns, and verify HMAC-SHA256 signatures in-memory.',
    keywords: 'jwt debugger, jwt decoder, jwt io alternative, verify jwt signature, jwt claims inspector',
  },
  json: {
    path: '/json-diff',
    tool: 'json',
    label: 'JSON Studio & Diff',
    title: 'JSON Studio, Formatter & Deep Structural Diff | Parso',
    description:
      '100% private JSON studio. Format, minify, sort keys, validate against JSON Schema Draft-07, and run deep visual structural diffs.',
    keywords: 'json diff, json formatter, json validator, json schema validator, compare json, format json online',
  },
  cron: {
    path: '/cron',
    tool: 'cron',
    label: 'Cron Visualizer',
    title: 'Cron Expression Generator & Visualizer | Parso',
    description:
      'Visual cron schedule builder, plain English translator, upcoming 10 execution run dates, and natural language to cron generator.',
    keywords: 'cron generator, cron visualizer, crontab guru, cron schedule, crontab translator',
  },
  regex: {
    path: '/regex',
    tool: 'regex',
    label: 'Regex & Explainer',
    title: 'Regex Tester & Embedded Semantic Explainer | Parso',
    description:
      'Real-time regular expression tester with live match highlighting, capture group inspector, syntax token breakdown, ReDoS security diagnostics, and embedded AST explanation with zero API keys.',
    keywords: 'regex tester, regex online, regular expression explainer, regex101 alternative, regex ast, regex redos',
  },
  curl: {
    path: '/curl',
    tool: 'curl',
    label: 'cURL Executor',
    title: 'cURL API Client & HTTP Executor | Parso',
    description:
      'Execute any REST, GraphQL, or webhook API with full CORS bypass, request visual builder, real-time response inspector, and code generator.',
    keywords: 'curl executor, api client, execute curl online, rest client, test api, postman alternative online, curl to fetch',
  },
};

export function getToolFromPath(pathname: string): ActiveTool {
  const clean = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (clean === '/json-diff' || clean === '/json' || clean === '/json-formatter') return 'json';
  if (clean === '/cron' || clean === '/crontab') return 'cron';
  if (clean === '/regex' || clean === '/regexp') return 'regex';
  if (clean === '/curl' || clean === '/curl-converter') return 'curl';
  return 'jwt';
}

export function getPathFromTool(tool: ActiveTool): RoutePath {
  if (tool === 'base64') return '/jwt';
  return ROUTES[tool]?.path || '/jwt';
}

export function updateMetaForRoute(tool: ActiveTool) {
  const config = ROUTES[tool];
  if (!config) return;

  document.title = config.title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', config.description);
  }

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', config.title);
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    ogDesc.setAttribute('content', config.description);
  }
}
