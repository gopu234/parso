import { RegexMatchItem, RegexToken } from '../types';

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
