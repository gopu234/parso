import { CronFieldDetail, CronParseResult } from '../types';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface ParsedCronPart {
  matches: (val: number) => boolean;
  values: number[];
  raw: string;
}

function parseCronPart(part: string, min: number, max: number, names?: string[]): ParsedCronPart {
  let normalized = part.trim().toUpperCase();

  // Replace text names if provided
  if (names) {
    names.forEach((name, idx) => {
      normalized = normalized.replace(new RegExp(name, 'g'), String(idx + (min === 1 ? 1 : 0)));
    });
  }

  const values = new Set<number>();

  if (normalized === '*' || normalized === '?') {
    for (let i = min; i <= max; i++) values.add(i);
  } else {
    const list = normalized.split(',');
    for (const item of list) {
      if (item.includes('/')) {
        const [range, stepStr] = item.split('/');
        const step = parseInt(stepStr, 10);
        if (isNaN(step) || step <= 0) continue;

        let start = min;
        let end = max;
        if (range !== '*' && range !== '') {
          if (range.includes('-')) {
            const [rStart, rEnd] = range.split('-');
            start = parseInt(rStart, 10);
            end = parseInt(rEnd, 10);
          } else {
            start = parseInt(range, 10);
          }
        }
        for (let i = start; i <= end; i += step) {
          if (i >= min && i <= max) values.add(i);
        }
      } else if (item.includes('-')) {
        const [rStart, rEnd] = item.split('-');
        const start = parseInt(rStart, 10);
        const end = parseInt(rEnd, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i >= min && i <= max) values.add(i);
          }
        }
      } else {
        const single = parseInt(item, 10);
        if (!isNaN(single) && single >= min && single <= max) {
          values.add(single);
        }
      }
    }
  }

  const valArray = Array.from(values).sort((a, b) => a - b);
  return {
    raw: part,
    values: valArray,
    matches: (val: number) => values.has(val),
  };
}

export function translateCronToHuman(parts: string[]): string {
  if (parts.length < 5) return 'Incomplete expression';

  const [min, hour, dom, mon, dow] = parts;

  // Simple clean sentence constructor
  let timeStr = '';
  if (min === '*' && hour === '*') {
    timeStr = 'Every minute';
  } else if (min.startsWith('*/')) {
    const step = min.replace('*/', '');
    timeStr = `Every ${step} minutes`;
    if (hour !== '*') {
      timeStr += ` at hour ${hour}`;
    }
  } else if (hour === '*') {
    timeStr = `At minute ${min} of every hour`;
  } else {
    // Specific hour & minute
    const pad = (n: string | number) => String(n).padStart(2, '0');
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    if (!isNaN(h) && !isNaN(m)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      timeStr = `At ${pad(h12)}:${pad(m)} ${ampm} (${pad(h)}:${pad(m)})`;
    } else {
      timeStr = `At ${hour}:${min}`;
    }
  }

  // Day of month
  let domStr = '';
  if (dom !== '*' && dom !== '?') {
    domStr = ` on day ${dom} of the month`;
  }

  // Month
  let monStr = '';
  if (mon !== '*') {
    monStr = ` in month ${mon}`;
  }

  // Day of week
  let dowStr = '';
  if (dow !== '*' && dow !== '?') {
    if (dow === '1-5' || dow === 'MON-FRI') {
      dowStr = ' on weekdays (Monday through Friday)';
    } else if (dow === '0,6' || dow === '6,0' || dow === 'SAT,SUN') {
      dowStr = ' on weekends (Saturday and Sunday)';
    } else {
      const days = dow.split(',').map((d) => {
        const num = parseInt(d, 10);
        return DAY_NAMES[num] || d;
      });
      dowStr = ` on ${days.join(', ')}`;
    }
  }

  return `${timeStr}${domStr}${monStr}${dowStr}`;
}

export function parseCron(expression: string): CronParseResult {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      expression,
      isValid: false,
      error: `Standard cron requires exactly 5 fields: Minute Hour Day-of-Month Month Day-of-Week (found ${parts.length})`,
      humanReadable: 'Invalid expression',
      fields: [],
      nextRuns: [],
    };
  }

  const [minStr, hourStr, domStr, monStr, dowStr] = parts;

  const minPart = parseCronPart(minStr, 0, 59);
  const hourPart = parseCronPart(hourStr, 0, 23);
  const domPart = parseCronPart(domStr, 1, 31);
  const monPart = parseCronPart(monStr, 1, 12, MONTH_NAMES);
  const dowPart = parseCronPart(dowStr, 0, 6, DAY_NAMES);

  const fields: CronFieldDetail[] = [
    {
      name: 'Minute',
      value: minStr,
      allowed: '0-59, */step, range',
      meaning: minPart.values.length === 60 ? 'Every minute' : `${minPart.values.length} minute values`,
      hasError: minPart.values.length === 0,
    },
    {
      name: 'Hour',
      value: hourStr,
      allowed: '0-23, */step, range',
      meaning: hourPart.values.length === 24 ? 'Every hour' : `${hourPart.values.length} hour values`,
      hasError: hourPart.values.length === 0,
    },
    {
      name: 'Day of Month',
      value: domStr,
      allowed: '1-31, *',
      meaning: domPart.values.length === 31 ? 'Every day of month' : `${domPart.values.length} days`,
      hasError: domPart.values.length === 0,
    },
    {
      name: 'Month',
      value: monStr,
      allowed: '1-12 or JAN-DEC',
      meaning: monPart.values.length === 12 ? 'Every month' : `${monPart.values.length} months`,
      hasError: monPart.values.length === 0,
    },
    {
      name: 'Day of Week',
      value: dowStr,
      allowed: '0-6 (0=Sun) or SUN-SAT',
      meaning: dowPart.values.length === 7 ? 'Every day of week' : `${dowPart.values.length} weekdays`,
      hasError: dowPart.values.length === 0,
    },
  ];

  const hasAnyError = fields.some((f) => f.hasError);
  if (hasAnyError) {
    return {
      expression,
      isValid: false,
      error: 'One or more fields have invalid syntax or out-of-range values',
      humanReadable: 'Invalid expression values',
      fields,
      nextRuns: [],
    };
  }

  // Calculate next 10 executions
  const nextRuns: Date[] = [];
  const now = new Date();
  const iterDate = new Date(now.getTime() + 60000); // Start next minute
  iterDate.setSeconds(0, 0);

  let iterations = 0;
  // Maximum search range: 5 years into future or 200,000 minutes
  while (nextRuns.length < 10 && iterations < 150000) {
    iterations++;
    const currentMin = iterDate.getMinutes();
    const currentHour = iterDate.getHours();
    const currentDom = iterDate.getDate();
    const currentMon = iterDate.getMonth() + 1;
    const currentDow = iterDate.getDay();

    if (
      monPart.matches(currentMon) &&
      domPart.matches(currentDom) &&
      dowPart.matches(currentDow) &&
      hourPart.matches(currentHour) &&
      minPart.matches(currentMin)
    ) {
      nextRuns.push(new Date(iterDate));
      iterDate.setMinutes(iterDate.getMinutes() + 1);
    } else {
      // Step optimization
      if (!monPart.matches(currentMon)) {
        // advance month
        iterDate.setMonth(iterDate.getMonth() + 1, 1);
        iterDate.setHours(0, 0, 0, 0);
      } else if (!domPart.matches(currentDom) || !dowPart.matches(currentDow)) {
        // advance day
        iterDate.setDate(iterDate.getDate() + 1);
        iterDate.setHours(0, 0, 0, 0);
      } else if (!hourPart.matches(currentHour)) {
        // advance hour
        iterDate.setHours(iterDate.getHours() + 1, 0, 0, 0);
      } else {
        iterDate.setMinutes(iterDate.getMinutes() + 1);
      }
    }
  }

  return {
    expression,
    isValid: true,
    humanReadable: translateCronToHuman(parts),
    fields,
    nextRuns,
  };
}

export const CRON_PRESETS = [
  { label: 'Every minute', cron: '* * * * *', description: 'Triggered at the start of every minute' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *', description: 'Standard health check or queue polling interval' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *', description: 'Frequent sync or reporting check' },
  { label: 'Every hour at :00', cron: '0 * * * *', description: 'Hourly batch updates' },
  { label: 'Every day at midnight', cron: '0 0 * * *', description: 'Daily database backup and cleanup' },
  { label: 'Weekdays at 9:00 AM', cron: '0 9 * * 1-5', description: 'Business hours notification digest' },
  { label: 'Every Sunday at 3:00 AM', cron: '0 3 * * 0', description: 'Weekly system maintenance during low traffic' },
  { label: '1st of every month at midnight', cron: '0 0 1 * *', description: 'Monthly billing cycle and invoicing runs' },
];
