export type ActiveTool = 'jwt' | 'cron' | 'json' | 'regex' | 'curl' | 'base64';

export interface JwtHeader {
  alg?: string;
  typ?: string;
  kid?: string;
  [key: string]: any;
}

export interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: any;
}

export interface JwtDecoded {
  rawHeader: string;
  rawPayload: string;
  rawSignature: string;
  header: JwtHeader | null;
  payload: JwtPayload | null;
  isValidStructure: boolean;
  error?: string;
}

export interface CronFieldDetail {
  name: string;
  value: string;
  allowed: string;
  meaning: string;
  hasError: boolean;
}

export interface CronParseResult {
  expression: string;
  isValid: boolean;
  error?: string;
  humanReadable: string;
  fields: CronFieldDetail[];
  nextRuns: Date[];
}

export interface DiffItem {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  path: string;
  oldValue?: any;
  newValue?: any;
  line?: number;
}

export interface SchemaValidationError {
  path: string;
  message: string;
  keyword: string;
}

export interface RegexMatchItem {
  index: number;
  endIndex: number;
  match: string;
  groups: { [key: string]: string };
  groupArray: string[];
}

export interface RegexToken {
  type: 'literal' | 'class' | 'quantifier' | 'group' | 'anchor' | 'lookaround' | 'special';
  raw: string;
  description: string;
}

export interface AiRegexExplanation {
  summary: string;
  tokens: Array<{ part: string; explanation: string }>;
  captureGroups: Array<{ group: string; pattern: string; purpose: string }>;
  potentialPitfalls: string[];
  suggestedOptimizations: string[];
  testCases?: {
    shouldMatch: string[];
    shouldFail: string[];
  };
}

export interface CurlParseResult {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: string;
  auth?: { user: string; pass: string };
  cookies: Record<string, string>;
  isValid: boolean;
  error?: string;
}

export interface CurlExecutionResult {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  isJson: boolean;
  parsedJson?: any;
  durationMs: number;
  sizeBytes: number;
  error?: string;
  timestamp: string;
}

export interface CurlHistoryItem {
  id: string;
  method: string;
  url: string;
  timestamp: string;
  status?: number;
  durationMs?: number;
  curlCommand: string;
}

export interface SavedCurlRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: string;
  curlCommand: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}
