import { RegexMatchItem, RegexToken, AiRegexExplanation } from '../types';

export function testRegexSafely(
  pattern: string,
  flags: string,
  testString: string
): { matches: RegexMatchItem[]; error?: string; executionTimeMs: number } {
  if (!pattern) {
    return { matches: [], executionTimeMs: 0 };
  }

  const start = performance.now();

  try {
    const reg = new RegExp(pattern, flags);
    const matches: RegexMatchItem[] = [];

    if (!flags.includes('g')) {
      const match = reg.exec(testString);
      if (match) {
        matches.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          match: match[0],
          groups: match.groups ? { ...match.groups } : {},
          groupArray: match.slice(1),
        });
      }
    } else {
      let match: RegExpExecArray | null;
      let count = 0;
      // Loop protection
      while ((match = reg.exec(testString)) !== null && count < 2000) {
        count++;
        matches.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          match: match[0],
          groups: match.groups ? { ...match.groups } : {},
          groupArray: match.slice(1),
        });

        // Zero-length match advance to avoid infinite loop
        if (match[0].length === 0) {
          reg.lastIndex++;
        }
      }
    }

    const elapsed = performance.now() - start;
    return {
      matches,
      executionTimeMs: Math.round(elapsed * 100) / 100,
    };
  } catch (err: any) {
    return {
      matches: [],
      error: err.message,
      executionTimeMs: 0,
    };
  }
}

export function parseRegexTokens(pattern: string): RegexToken[] {
  const tokens: RegexToken[] = [];
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    // Escaped sequences
    if (char === '\\' && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      const seq = '\\' + next;
      i += 2;

      if (['d', 'D'].includes(next)) {
        tokens.push({
          type: 'class',
          raw: seq,
          description: next === 'd' ? 'Digit [0-9]' : 'Non-digit [^0-9]',
        });
      } else if (['w', 'W'].includes(next)) {
        tokens.push({
          type: 'class',
          raw: seq,
          description: next === 'w' ? 'Word character [a-zA-Z0-9_]' : 'Non-word character',
        });
      } else if (['s', 'S'].includes(next)) {
        tokens.push({
          type: 'class',
          raw: seq,
          description: next === 's' ? 'Whitespace (spaces, tabs, newlines)' : 'Non-whitespace',
        });
      } else if (['b', 'B'].includes(next)) {
        tokens.push({
          type: 'anchor',
          raw: seq,
          description: next === 'b' ? 'Word boundary position' : 'Non-word boundary',
        });
      } else {
        tokens.push({
          type: 'literal',
          raw: seq,
          description: `Escaped literal character "${next}"`,
        });
      }
      continue;
    }

    // Anchors
    if (char === '^') {
      tokens.push({ type: 'anchor', raw: '^', description: 'Start of line/string anchor' });
      i++;
      continue;
    }
    if (char === '$') {
      tokens.push({ type: 'anchor', raw: '$', description: 'End of line/string anchor' });
      i++;
      continue;
    }

    // Character sets [ ... ]
    if (char === '[') {
      let closeIdx = pattern.indexOf(']', i + 1);
      if (closeIdx === -1) closeIdx = pattern.length - 1;
      const setStr = pattern.slice(i, closeIdx + 1);
      const isNegated = setStr.startsWith('[^');
      tokens.push({
        type: 'class',
        raw: setStr,
        description: isNegated ? `Negated character set: match anything NOT in ${setStr}` : `Character set: match one character in ${setStr}`,
      });
      i = closeIdx + 1;
      continue;
    }

    // Quantifiers
    if (char === '*' || char === '+' || char === '?') {
      const isLazy = pattern[i + 1] === '?';
      const raw = isLazy ? char + '?' : char;
      const lazyDesc = isLazy ? ' (lazy / non-greedy)' : ' (greedy)';
      let desc = '';
      if (char === '*') desc = 'Zero or more occurrences' + lazyDesc;
      if (char === '+') desc = 'One or more occurrences' + lazyDesc;
      if (char === '?') desc = 'Zero or one occurrence (optional)' + (isLazy ? ' (lazy)' : '');
      tokens.push({ type: 'quantifier', raw, description: desc });
      i += isLazy ? 2 : 1;
      continue;
    }

    // Explicit range quantifier {n,m}
    if (char === '{') {
      const closeIdx = pattern.indexOf('}', i + 1);
      if (closeIdx !== -1) {
        const qStr = pattern.slice(i, closeIdx + 1);
        tokens.push({
          type: 'quantifier',
          raw: qStr,
          description: `Quantifier: repeat between bounds specified in ${qStr}`,
        });
        i = closeIdx + 1;
        continue;
      }
    }

    // Groups & Lookarounds
    if (char === '(') {
      if (pattern.slice(i, i + 3) === '(?:') {
        tokens.push({ type: 'group', raw: '(?:', description: 'Non-capturing group start' });
        i += 3;
      } else if (pattern.slice(i, i + 3) === '(?=') {
        tokens.push({ type: 'lookaround', raw: '(?=', description: 'Positive lookahead (?=...)' });
        i += 3;
      } else if (pattern.slice(i, i + 3) === '(?!') {
        tokens.push({ type: 'lookaround', raw: '(?!', description: 'Negative lookahead (?!...)' });
        i += 3;
      } else if (pattern.slice(i, i + 4) === '(?<=') {
        tokens.push({ type: 'lookaround', raw: '(?<=', description: 'Positive lookbehind (?<=...)' });
        i += 4;
      } else if (pattern.slice(i, i + 4) === '(?<!') {
        tokens.push({ type: 'lookaround', raw: '(?<!', description: 'Negative lookbehind (?<!...)' });
        i += 4;
      } else if (pattern.slice(i, i + 3) === '(?<') {
        const nameEnd = pattern.indexOf('>', i + 3);
        if (nameEnd !== -1) {
          const name = pattern.slice(i + 3, nameEnd);
          tokens.push({ type: 'group', raw: `(?<${name}>`, description: `Named capture group '${name}'` });
          i = nameEnd + 1;
        } else {
          tokens.push({ type: 'group', raw: '(', description: 'Capture group start' });
          i++;
        }
      } else {
        tokens.push({ type: 'group', raw: '(', description: 'Numbered capture group start' });
        i++;
      }
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'group', raw: ')', description: 'Close group' });
      i++;
      continue;
    }

    if (char === '|') {
      tokens.push({ type: 'special', raw: '|', description: 'Alternation (OR operator)' });
      i++;
      continue;
    }

    if (char === '.') {
      tokens.push({ type: 'class', raw: '.', description: 'Wildcard: any character except line breaks' });
      i++;
      continue;
    }

    // Default literal
    tokens.push({ type: 'literal', raw: char, description: `Literal text "${char}"` });
    i++;
  }

  return tokens;
}

export const REGEX_PRESETS = [
  {
    name: 'Email Address (RFC 5322 standard)',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    flags: 'gm',
    sample: 'developer@example.io\njohn.doe+test@gmail.com\ninvalid-email@\nhello@domain.co.uk',
    description: 'Validates standard modern email addresses with domain extensions.',
  },
  {
    name: 'URL / Web Address (HTTP/HTTPS)',
    pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)',
    flags: 'gi',
    sample: 'Check out https://github.com/google/genai and http://localhost:3000/api/v1/users?page=2&limit=50 for details.',
    description: 'Matches valid web URLs with paths and query parameters.',
  },
  {
    name: 'IPv4 Address with Octets',
    pattern: '\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
    flags: 'g',
    sample: 'DNS servers: 127.0.0.1, 8.8.8.8, 192.168.1.254, and invalid 999.300.1.1',
    description: 'Validates bounded IPv4 octets between 0 and 255.',
  },
  {
    name: 'UUID v4 Identifier',
    pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}',
    flags: 'gi',
    sample: 'Generated session: 123e4567-e89b-42d3-a456-426614174000 and user id: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    description: 'Matches RFC 4122 compliant version 4 UUIDs.',
  },
  {
    name: 'ISO 8601 Timestamp',
    pattern: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})',
    flags: 'g',
    sample: 'Event created at 2026-09-13T19:47:53.000Z and updated 2026-09-14T02:30:00+02:00.',
    description: 'Matches standardized ISO 8601 date and time formats.',
  },
  {
    name: 'Semantic Versioning (SemVer)',
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$',
    flags: 'gm',
    sample: 'v1.0.0\n2.14.3-beta.1+build.2026\n0.0.1\ninvalid.version.number',
    description: 'Standard SemVer 2.0.0 parser with prerelease and build metadata.',
  },
];

/**
 * Built-in Semantic AST Regex Explainer
 * Runs 100% locally in the browser with 0ms latency, zero API keys, and zero network calls.
 */
export function explainRegexLocally(
  pattern: string,
  flags: string,
  _testString?: string
): AiRegexExplanation {
  if (!pattern || !pattern.trim()) {
    return {
      summary: 'Empty pattern provided.',
      tokens: [],
      captureGroups: [],
      potentialPitfalls: ['No pattern entered.'],
      suggestedOptimizations: ['Enter a regular expression pattern to test and analyze.'],
      testCases: { shouldMatch: [], shouldFail: [] },
    };
  }

  // 1. Parse tokens
  const rawTokens = parseRegexTokens(pattern);
  const tokenBreakdown = rawTokens.map((t) => ({
    part: t.raw,
    explanation: t.description,
  }));

  // 2. Extract capture groups and lookarounds
  const captureGroups = extractSemanticGroups(pattern);

  // 3. Diagnose pitfalls and security/performance risks
  const potentialPitfalls = detectRegexPitfalls(pattern, flags);

  // 4. Generate optimization recommendations
  const suggestedOptimizations = detectRegexOptimizations(pattern, flags, captureGroups);

  // 5. Archetype detection and executive summary synthesis
  const archetype = detectArchetype(pattern);
  let summary = '';
  let testCases = { shouldMatch: [] as string[], shouldFail: [] as string[] };

  if (archetype) {
    summary = archetype.summary;
    testCases = archetype.testCases;
  } else {
    summary = synthesizeSemanticSummary(pattern, flags, rawTokens, captureGroups);
    testCases = synthesizeTestCases(pattern, flags);
  }

  // Add flag explanations to summary if active
  const flagDescriptions: string[] = [];
  if (flags.includes('g')) flagDescriptions.push('global search (all occurrences)');
  if (flags.includes('i')) flagDescriptions.push('case-insensitive matching');
  if (flags.includes('m')) flagDescriptions.push('multiline anchors (^ and $ match line breaks)');
  if (flags.includes('s')) flagDescriptions.push('dotAll mode (. matches newlines)');
  if (flags.includes('u')) flagDescriptions.push('full Unicode code point handling');

  if (flagDescriptions.length > 0) {
    summary += ` Evaluates with ${flagDescriptions.join(', ')}.`;
  }

  return {
    summary,
    tokens: tokenBreakdown,
    captureGroups,
    potentialPitfalls,
    suggestedOptimizations,
    testCases,
  };
}

/**
 * Parses all balanced group constructs while ignoring escaped brackets
 */
function extractSemanticGroups(
  pattern: string
): Array<{ group: string; pattern: string; purpose: string }> {
  const groups: Array<{ group: string; pattern: string; purpose: string }> = [];
  let groupCounter = 1;
  let inCharClass = false;
  let isEscaped = false;

  const stack: Array<{ startIndex: number; header: string; type: string; name?: string }> = [];

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '[' && !inCharClass) {
      inCharClass = true;
      continue;
    }

    if (char === ']' && inCharClass) {
      inCharClass = false;
      continue;
    }

    if (inCharClass) continue;

    if (char === '(') {
      // Determine group header
      if (pattern.slice(i, i + 3) === '(?:') {
        stack.push({ startIndex: i, header: '(?:', type: 'non-capturing' });
        i += 2;
      } else if (pattern.slice(i, i + 3) === '(?=') {
        stack.push({ startIndex: i, header: '(?=', type: 'positive-lookahead' });
        i += 2;
      } else if (pattern.slice(i, i + 3) === '(?!') {
        stack.push({ startIndex: i, header: '(?!', type: 'negative-lookahead' });
        i += 2;
      } else if (pattern.slice(i, i + 4) === '(?<=') {
        stack.push({ startIndex: i, header: '(?<=', type: 'positive-lookbehind' });
        i += 3;
      } else if (pattern.slice(i, i + 4) === '(?<!') {
        stack.push({ startIndex: i, header: '(?<!', type: 'negative-lookbehind' });
        i += 3;
      } else if (pattern.slice(i, i + 3) === '(?<') {
        const nameEnd = pattern.indexOf('>', i + 3);
        if (nameEnd !== -1) {
          const name = pattern.slice(i + 3, nameEnd);
          stack.push({ startIndex: i, header: `(?<${name}>`, type: 'named', name });
          i = nameEnd;
        } else {
          stack.push({ startIndex: i, header: '(', type: 'numbered' });
        }
      } else {
        stack.push({ startIndex: i, header: '(', type: 'numbered' });
      }
    } else if (char === ')') {
      const top = stack.pop();
      if (top) {
        const subpattern = pattern.slice(top.startIndex, i + 1);
        let groupLabel = '';
        let purpose = '';

        if (top.type === 'non-capturing') {
          groupLabel = 'Non-Capturing Group';
          purpose = 'Groups sub-expressions for quantifiers or alternations without retaining them in backreference memory.';
        } else if (top.type === 'positive-lookahead') {
          groupLabel = 'Positive Lookahead (?=...)';
          purpose = 'Asserts that this condition exists immediately ahead without consuming characters.';
        } else if (top.type === 'negative-lookahead') {
          groupLabel = 'Negative Lookahead (?!...)';
          purpose = 'Asserts that this condition does NOT match immediately ahead.';
        } else if (top.type === 'positive-lookbehind') {
          groupLabel = 'Positive Lookbehind (?<=...)';
          purpose = 'Asserts that this condition exists immediately behind without moving pointer.';
        } else if (top.type === 'negative-lookbehind') {
          groupLabel = 'Negative Lookbehind (?<!...)';
          purpose = 'Asserts that this condition does NOT precede the current position.';
        } else if (top.type === 'named') {
          groupLabel = `Named Group '${top.name}'`;
          purpose = `Stores match in result.groups['${top.name}'] for readable programmatic extraction.`;
        } else {
          groupLabel = `Group #${groupCounter++}`;
          purpose = 'Captures the matched substring into indexed extraction array ($1, $2, etc.).';
        }

        groups.push({
          group: groupLabel,
          pattern: subpattern,
          purpose,
        });
      }
    }
  }

  return groups;
}

/**
 * Static Analysis Linter for ReDoS, unescaped literals, and common regex traps
 */
function detectRegexPitfalls(pattern: string, flags: string): string[] {
  const pitfalls: string[] = [];

  // 1. ReDoS / Catastrophic Backtracking check (nested quantifiers)
  // e.g. (a+)+, (.*)*, (\w+)+, ([a-z]+)+, (\d+)*
  const nestedQuantifierRegex = /\((?:[^()]|\([^()]*\))*[+*][^()]*\)[+*]/;
  if (nestedQuantifierRegex.test(pattern)) {
    pitfalls.push(
      '⚠️ High Catastrophic Backtracking Risk (ReDoS): Detected nested repetition inside repeated group (e.g., `(a+)+` or `(.*)*`). Non-matching inputs could cause CPU freeze and exponential execution latency.'
    );
  }

  // 2. Unescaped dot in domain extensions or decimals
  // e.g. .com, .org, .net, .io, .js, .json
  const unescapedDomain = /(?:^|[^\\])\.(?:com|org|net|io|edu|gov|co|app|dev|js|ts|json|html)\b/i;
  if (unescapedDomain.test(pattern)) {
    pitfalls.push(
      '⚠️ Unescaped Dot Literal: A raw `.` was used before a domain or file extension. The dot matches ANY character (e.g. `xcom` instead of `.com`). Replace with escaped `\\.`.'
    );
  }

  // 3. Unanchored validation check
  const isValidationCandidate =
    pattern.includes('@') ||
    pattern.includes('\\d{') ||
    pattern.includes('http') ||
    pattern.includes('[a-zA-Z0-9]');
  const isAnchoredStart = pattern.startsWith('^');
  const isAnchoredEnd = pattern.endsWith('$');

  if (isValidationCandidate && (!isAnchoredStart || !isAnchoredEnd)) {
    pitfalls.push(
      '💡 Missing Boundary Anchors: Pattern lacks `^` (start) or `$` (end). It will match partial strings (e.g., `"malicious_payload_user@domain.com_suffix"` will still pass validation).'
    );
  }

  // 4. Overly greedy wildcard `.*`
  if (pattern.includes('.*') && !pattern.includes('.*?')) {
    pitfalls.push(
      'ℹ️ Greedy Wildcard `.*`: The greedy quantifier consumes as much text as possible until the last delimiter. If matching between quotes or tags, use lazy `.*?` or negated sets like `[^"]*`.'
    );
  }

  // 5. Redundant case-insensitivity flag
  if (flags.includes('i') && /[a-z]-[A-Z]|[A-Z]-[a-z]/.test(pattern)) {
    pitfalls.push(
      'ℹ️ Redundant Character Range: The `i` (case-insensitive) flag is active, so specifying both uppercase and lowercase (e.g. `[a-zA-Z]`) is redundant. `[a-z]` is sufficient.'
    );
  }

  if (pitfalls.length === 0) {
    pitfalls.push('✅ No catastrophic backtracking or syntax vulnerabilities detected. Clean execution profile.');
  }

  return pitfalls;
}

/**
 * Generates actionable performance and clean-code optimizations
 */
function detectRegexOptimizations(
  pattern: string,
  _flags: string,
  groups: Array<{ group: string; pattern: string; purpose: string }>
): string[] {
  const suggestions: string[] = [];

  // Suggest non-capturing groups
  const numberedGroups = groups.filter((g) => g.group.startsWith('Group #'));
  if (numberedGroups.length > 1) {
    suggestions.push(
      `Convert ${numberedGroups.length} standard capture groups to non-capturing groups \`(?:...)\` if you don't need backreferences. This reduces memory allocation and speeds up evaluation by ~20%.`
    );
  }

  // Suggest \d instead of [0-9]
  if (pattern.includes('[0-9]')) {
    suggestions.push('Replace `[0-9]` with shorthand character class `\\d` for more concise readability.');
  }

  // Suggest \w instead of [a-zA-Z0-9_]
  if (pattern.includes('[a-zA-Z0-9_]') || pattern.includes('[A-Za-z0-9_]')) {
    suggestions.push('Replace `[a-zA-Z0-9_]` with the native shorthand `\\w`.');
  }

  // Suggest word boundaries for identifier searches
  if (!pattern.includes('\\b') && !pattern.startsWith('^') && !pattern.endsWith('$')) {
    suggestions.push(
      'Consider adding word boundaries `\\b` at boundaries to prevent unwanted partial word matches.'
    );
  }

  if (suggestions.length === 0) {
    suggestions.push('Regex syntax is already concise and adheres to modern ECMAScript standards.');
  }

  return suggestions;
}

/**
 * Recognizes common developer patterns to deliver instant high-fidelity summaries
 */
function detectArchetype(pattern: string): {
  summary: string;
  testCases: { shouldMatch: string[]; shouldFail: string[] };
} | null {
  // Email
  if (pattern.includes('@') && (pattern.includes('\\.') || pattern.includes('.')) && pattern.includes('{2,')) {
    return {
      summary:
        'Validates standardized RFC email addresses. Verifies the user mailbox alias, requires an "@" separator, validates domain labels, and checks for a valid top-level domain (TLD) extension.',
      testCases: {
        shouldMatch: ['developer@parso.tools', 'john.doe+ops@company.co.uk', 'admin@subdomain.example.io'],
        shouldFail: ['plainaddress', '@missinguser.com', 'user@domain..com', 'user@domain'],
      },
    };
  }

  // URL / URI
  if (pattern.includes('https?') || pattern.includes('http')) {
    return {
      summary:
        'Matches standardized Web URLs (HTTP and HTTPS). Extracts protocol scheme, optional www subdomain, domain name hostname, port numbers, and URL query path parameters.',
      testCases: {
        shouldMatch: [
          'https://parso.tools/jwt?v=1',
          'http://localhost:3000/api/health',
          'https://github.com/google/genai/issues',
        ],
        shouldFail: ['ftp://invalid-scheme.com', 'just-text-no-protocol', 'http:/missing-slash.com'],
      },
    };
  }

  // IPv4 Address
  if (pattern.includes('25[0-5]') || (pattern.includes('255') && pattern.includes('\\.'))) {
    return {
      summary:
        'Validates strictly bounded IPv4 addresses with 4 octets. Restricts each numerical segment to the valid 0–255 networking range separated by periods.',
      testCases: {
        shouldMatch: ['127.0.0.1', '192.168.1.1', '10.0.0.254', '8.8.8.8'],
        shouldFail: ['256.100.0.1', '192.168.1', '1.2.3.4.5', '999.999.999.999'],
      },
    };
  }

  // UUID v4
  if (pattern.includes('{8}-') && pattern.includes('-4[0-9a-fA-F]{3}-')) {
    return {
      summary:
        'Matches RFC 4122 standard Version 4 UUID strings (universally unique identifiers). Enforces standard 8-4-4-4-12 hex layout and version 4 variant bits.',
      testCases: {
        shouldMatch: [
          '123e4567-e89b-42d3-a456-426614174000',
          'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        ],
        shouldFail: [
          '123e4567-e89b-12d3-a456-426614174000',
          'not-a-valid-uuid-length',
          '123e4567e89b42d3a456426614174000',
        ],
      },
    };
  }

  // ISO 8601 Timestamp
  if (pattern.includes('\\d{4}-\\d{2}-\\d{2}') && pattern.includes('T\\d{2}:\\d{2}')) {
    return {
      summary:
        'Validates standardized ISO 8601 extended date-time strings with year-month-day, hours:minutes:seconds, optional fractional milliseconds, and UTC Z or timezone offsets.',
      testCases: {
        shouldMatch: ['2026-09-14T18:30:00Z', '2026-01-01T00:00:00.000Z', '2026-12-31T23:59:59+05:30'],
        shouldFail: ['2026/09/14 18:30:00', '14-09-2026T18:30:00Z', '2026-09-14'],
      },
    };
  }

  // SemVer
  if (pattern.includes('\\d*)\\.(0|[1-9]\\d*)') || (pattern.includes('v?') && pattern.includes('SemVer'))) {
    return {
      summary:
        'Parses Semantic Versioning 2.0.0 numbers. Deconstructs Major.Minor.Patch numerical versions with optional prerelease designations (-beta.1) and build metadata (+20260914).',
      testCases: {
        shouldMatch: ['1.0.0', 'v2.4.1-beta.3', '0.0.1+build.449'],
        shouldFail: ['1.0', 'v1.0.0.0', '1.0.0-'],
      },
    };
  }

  return null;
}

/**
 * Builds an articulate English synthesis based on actual AST structure
 */
function synthesizeSemanticSummary(
  pattern: string,
  _flags: string,
  tokens: RegexToken[],
  groups: Array<{ group: string; pattern: string; purpose: string }>
): string {
  const isAnchoredStart = pattern.startsWith('^');
  const isAnchoredEnd = pattern.endsWith('$');

  let structureScope = 'Searches for matching character patterns';
  if (isAnchoredStart && isAnchoredEnd) {
    structureScope = 'Strictly validates full-length strings from start to finish (`^` to `$`)';
  } else if (isAnchoredStart) {
    structureScope = 'Matches text anchored at the beginning of the string (`^`)';
  } else if (isAnchoredEnd) {
    structureScope = 'Matches text anchored at the ending of the string (`$`)';
  }

  const elements: string[] = [];
  if (tokens.some((t) => t.type === 'class' && (t.raw.includes('\\d') || t.raw.includes('0-9')))) {
    elements.push('numeric digits');
  }
  if (tokens.some((t) => t.type === 'class' && (t.raw.includes('\\w') || t.raw.includes('a-z') || t.raw.includes('a-zA-Z')))) {
    elements.push('alphanumeric characters');
  }
  if (tokens.some((t) => t.type === 'class' && t.raw.includes('\\s'))) {
    elements.push('whitespace delimiters');
  }
  if (tokens.some((t) => t.type === 'quantifier')) {
    elements.push('bounded and repeating lengths');
  }

  const elementClause = elements.length > 0 ? ` consisting of ${elements.join(', ')}` : '';
  const groupClause =
    groups.length > 0 ? ` Contains ${groups.length} distinct group constructs.` : '';

  return `${structureScope}${elementClause}.${groupClause}`;
}

/**
 * Synthesizes test cases for generic patterns
 */
function synthesizeTestCases(
  pattern: string,
  flags: string
): { shouldMatch: string[]; shouldFail: string[] } {
  const shouldMatch: string[] = [];
  const shouldFail: string[] = [];

  try {
    const reg = new RegExp(pattern, flags);
    const candidates = ['sample', '123', 'admin_user', 'hello-world', 'test@test.com', '2026', 'true', 'key:value'];
    for (const c of candidates) {
      if (reg.test(c) && shouldMatch.length < 3) {
        shouldMatch.push(c);
      } else if (!reg.test(c) && shouldFail.length < 3) {
        shouldFail.push(c);
      }
    }
  } catch {
    // If compilation fails
  }

  return { shouldMatch, shouldFail };
}

