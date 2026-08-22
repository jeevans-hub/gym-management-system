import { attendanceDateFromKey, getGymDateKey } from '@/lib/attendance-dates';

export const REPORT_TIME_ZONE = 'Asia/Kolkata';
export const MAX_REPORT_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESETS = ['today', 'this-week', 'this-month', 'custom'] as const;

export type ReportRangePreset = (typeof PRESETS)[number];

export interface ReportDateRange {
  preset: ReportRangePreset;
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
  days: number;
  timeZone: typeof REPORT_TIME_ZONE;
}

type RangeResult =
  | { success: true; data: ReportDateRange }
  | { success: false; error: string };

function addGymDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function startOfWeek(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addGymDays(dateKey, -(weekday === 0 ? 6 : weekday - 1));
}

function startOfMonth(dateKey: string): string {
  return `${dateKey.slice(0, 8)}01`;
}

export function parseReportDateRange(
  searchParams: URLSearchParams,
  defaultPreset: Exclude<ReportRangePreset, 'custom'> = 'this-month',
  now = new Date()
): RangeResult {
  const presetValue = searchParams.get('range')?.trim();
  const fromValue = searchParams.get('from')?.trim();
  const toValue = searchParams.get('to')?.trim();

  if (presetValue && !PRESETS.includes(presetValue as ReportRangePreset)) {
    return {
      success: false,
      error: `Range must be one of: ${PRESETS.join(', ')}`,
    };
  }

  const hasExplicitDates = Boolean(fromValue || toValue);
  const preset = (presetValue as ReportRangePreset | undefined) ??
    (hasExplicitDates ? 'custom' : defaultPreset);

  if (hasExplicitDates && preset !== 'custom') {
    return { success: false, error: 'Use either a named range or custom from/to dates' };
  }
  if (preset === 'custom' && (!fromValue || !toValue)) {
    return { success: false, error: 'Custom ranges require both from and to dates' };
  }

  const today = getGymDateKey(now);
  let from = today;
  let to = today;

  if (preset === 'this-week') {
    from = startOfWeek(today);
  } else if (preset === 'this-month') {
    from = startOfMonth(today);
  } else if (preset === 'custom') {
    from = fromValue!;
    to = toValue!;
  }

  const start = attendanceDateFromKey(from);
  const toStart = attendanceDateFromKey(to);
  if (!start || !toStart) {
    return { success: false, error: 'Dates must be real calendar dates in YYYY-MM-DD format' };
  }
  if (start.getTime() > toStart.getTime()) {
    return { success: false, error: 'From date cannot be after to date' };
  }

  const days = Math.round((toStart.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days > MAX_REPORT_RANGE_DAYS) {
    return {
      success: false,
      error: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} inclusive gym days`,
    };
  }

  return {
    success: true,
    data: {
      preset,
      from,
      to,
      start,
      endExclusive: new Date(toStart.getTime() + DAY_MS),
      days,
      timeZone: REPORT_TIME_ZONE,
    },
  };
}

export function reportRangeResponse(range: ReportDateRange) {
  return {
    preset: range.preset,
    from: range.from,
    to: range.to,
    days: range.days,
    timeZone: range.timeZone,
    boundaries: 'inclusive gym dates',
  };
}

export function gymDateKeyFromUtcBoundary(value: Date): string {
  return getGymDateKey(value);
}
