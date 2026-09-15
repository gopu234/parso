import { DiffItem, SchemaValidationError } from '../types';

export function formatJson(
  input: string,
  indent: number | string = 2,
  sortKeys: boolean = false
): { formatted: string; error?: string; stats?: { bytes: number; lines: number; keysCount: number } } {
  try {
    let parsed = JSON.parse(input);
    if (sortKeys) {
      parsed = sortObjectKeys(parsed);
    }
    const indentVal = indent === 'tab' ? '\t' : Number(indent);
    const formatted = JSON.stringify(parsed, null, indentVal);
    const keysCount = countKeys(parsed);
    return {
      formatted,
      stats: {
        bytes: new TextEncoder().encode(formatted).length,
        lines: formatted.split('\n').length,
        keysCount,
      },
    };
  } catch (err: any) {
    return {
      formatted: input,
      error: err.message,
    };
  }
}

export function minifyJson(input: string): { minified: string; error?: string } {
  try {
    const parsed = JSON.parse(input);
    return { minified: JSON.stringify(parsed) };
  } catch (err: any) {
    return { minified: input, error: err.message };
  }
}

function countKeys(obj: any): number {
  if (obj === null || typeof obj !== 'object') return 0;
  let count = 0;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countKeys(item);
    }
  } else {
    count += Object.keys(obj).length;
    for (const key of Object.keys(obj)) {
      count += countKeys(obj[key]);
    }
  }
  return count;
}

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sorted: Record<string, any> = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
  return sorted;
}

export function computeJsonDiff(
  originalStr: string,
  modifiedStr: string
): { diffs: DiffItem[]; error?: string } {
  let origObj: any;
  let modObj: any;

  try {
    origObj = JSON.parse(originalStr);
  } catch (e: any) {
    return { diffs: [], error: `Original JSON Syntax Error: ${e.message}` };
  }

  try {
    modObj = JSON.parse(modifiedStr);
  } catch (e: any) {
    return { diffs: [], error: `Modified JSON Syntax Error: ${e.message}` };
  }

  const diffs: DiffItem[] = [];

  function compareRecursive(a: any, b: any, path: string) {
    // Both are strictly identical
    if (a === b) {
      diffs.push({ type: 'unchanged', path, oldValue: a, newValue: b });
      return;
    }

    // Type mismatch or one is primitive
    if (
      typeof a !== typeof b ||
      a === null ||
      b === null ||
      Array.isArray(a) !== Array.isArray(b) ||
      typeof a !== 'object'
    ) {
      diffs.push({ type: 'modified', path, oldValue: a, newValue: b });
      return;
    }

    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`;
        if (i >= a.length) {
          diffs.push({ type: 'added', path: itemPath, newValue: b[i] });
        } else if (i >= b.length) {
          diffs.push({ type: 'removed', path: itemPath, oldValue: a[i] });
        } else {
          compareRecursive(a[i], b[i], itemPath);
        }
      }
      return;
    }

    // Objects
    const aKeys = new Set(Object.keys(a));
    const bKeys = new Set(Object.keys(b));
    const allKeys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      if (!aKeys.has(key)) {
        diffs.push({ type: 'added', path: childPath, newValue: b[key] });
      } else if (!bKeys.has(key)) {
        diffs.push({ type: 'removed', path: childPath, oldValue: a[key] });
      } else {
        compareRecursive(a[key], b[key], childPath);
      }
    }
  }

  compareRecursive(origObj, modObj, '');
  return { diffs };
}

// Lightweight standard JSON Schema validator
export function validateJsonSchema(
  dataStr: string,
  schemaStr: string
): { isValid: boolean; errors: SchemaValidationError[]; error?: string } {
  let data: any;
  let schema: any;

  try {
    data = JSON.parse(dataStr);
  } catch (e: any) {
    return { isValid: false, errors: [], error: `Data JSON invalid: ${e.message}` };
  }

  try {
    schema = JSON.parse(schemaStr);
  } catch (e: any) {
    return { isValid: false, errors: [], error: `Schema JSON invalid: ${e.message}` };
  }

  const errors: SchemaValidationError[] = [];

  function validateNode(val: any, sNode: any, path: string) {
    if (!sNode || typeof sNode !== 'object') return;

    // Type check
    if (sNode.type) {
      const expectedTypes = Array.isArray(sNode.type) ? sNode.type : [sNode.type];
      const actualType = getJsonType(val);
      const isInteger = actualType === 'number' && Number.isInteger(val);

      const matches = expectedTypes.some(
        (t: string) => t === actualType || (t === 'integer' && isInteger)
      );

      if (!matches) {
        errors.push({
          path: path || '$',
          keyword: 'type',
          message: `Expected type ${expectedTypes.join(' or ')}, but received ${actualType}`,
        });
        return; // Stop checking sub-rules if base type is wrong
      }
    }

    // Enum
    if (Array.isArray(sNode.enum)) {
      const inEnum = sNode.enum.some((item: any) => JSON.stringify(item) === JSON.stringify(val));
      if (!inEnum) {
        errors.push({
          path: path || '$',
          keyword: 'enum',
          message: `Value is not one of the allowed enum values: [${sNode.enum.join(', ')}]`,
        });
      }
    }

    // String constraints
    if (typeof val === 'string') {
      if (typeof sNode.minLength === 'number' && val.length < sNode.minLength) {
        errors.push({
          path: path || '$',
          keyword: 'minLength',
          message: `String length (${val.length}) is shorter than minLength (${sNode.minLength})`,
        });
      }
      if (typeof sNode.maxLength === 'number' && val.length > sNode.maxLength) {
        errors.push({
          path: path || '$',
          keyword: 'maxLength',
          message: `String length (${val.length}) exceeds maxLength (${sNode.maxLength})`,
        });
      }
      if (sNode.pattern) {
        try {
          const reg = new RegExp(sNode.pattern);
          if (!reg.test(val)) {
            errors.push({
              path: path || '$',
              keyword: 'pattern',
              message: `String does not match pattern "${sNode.pattern}"`,
            });
          }
        } catch (e) {
          // ignore invalid schema pattern
        }
      }
    }

    // Number constraints
    if (typeof val === 'number') {
      if (typeof sNode.minimum === 'number' && val < sNode.minimum) {
        errors.push({
          path: path || '$',
          keyword: 'minimum',
          message: `Number ${val} is less than minimum (${sNode.minimum})`,
        });
      }
      if (typeof sNode.maximum === 'number' && val > sNode.maximum) {
        errors.push({
          path: path || '$',
          keyword: 'maximum',
          message: `Number ${val} is greater than maximum (${sNode.maximum})`,
        });
      }
    }

    // Object constraints
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Required properties
      if (Array.isArray(sNode.required)) {
        for (const reqKey of sNode.required) {
          if (!(reqKey in val)) {
            errors.push({
              path: path ? `${path}.${reqKey}` : `$.${reqKey}`,
              keyword: 'required',
              message: `Missing required property '${reqKey}'`,
            });
          }
        }
      }

      // Properties recursion
      if (sNode.properties && typeof sNode.properties === 'object') {
        for (const propKey of Object.keys(sNode.properties)) {
          if (propKey in val) {
            validateNode(
              val[propKey],
              sNode.properties[propKey],
              path ? `${path}.${propKey}` : `$.${propKey}`
            );
          }
        }
      }
    }

    // Array constraints
    if (Array.isArray(val)) {
      if (typeof sNode.minItems === 'number' && val.length < sNode.minItems) {
        errors.push({
          path: path || '$',
          keyword: 'minItems',
          message: `Array has ${val.length} items, requires at least ${sNode.minItems}`,
        });
      }
      if (typeof sNode.maxItems === 'number' && val.length > sNode.maxItems) {
        errors.push({
          path: path || '$',
          keyword: 'maxItems',
          message: `Array has ${val.length} items, maximum allowed is ${sNode.maxItems}`,
        });
      }
      if (sNode.items && typeof sNode.items === 'object') {
        val.forEach((item, index) => {
          validateNode(item, sNode.items, `${path || '$'}[${index}]`);
        });
      }
    }
  }

  function getJsonType(v: any): string {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }

  validateNode(data, schema, '$');

  return {
    isValid: errors.length === 0,
    errors,
  };
}
