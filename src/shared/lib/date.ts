// 날짜는 'YYYY-MM-DD' 문자열, 시각은 자정 기준 분(number)으로 다룬다. 시간대 영향을 받지 않도록 UTC로만 계산한다.

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y = NaN, m = NaN, d = NaN] = ymd.split("-").map(Number);
  return { y, m, d };
}

export function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 0=일 … 6=토 */
export function weekdayOf(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 그 달의 몇째 요일인지 (1~7일 = 1, 8~14일 = 2 …) — 부록 A X4 */
export function nthWeekdayOfMonth(ymd: string): number {
  return Math.ceil(parseYmd(ymd).d / 7);
}

export function addDays(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const pa = parseYmd(a);
  const pb = parseYmd(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86400000);
}

/** 기기 시각 기준 'YYYY-MM-DD' */
export function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** 600 → '10:00' */
export function hhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** '09:30' → 570, '24:00' → 1440 */
export function parseHhmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59 || (h === 24 && mm > 0)) return null;
  return h * 60 + mm;
}

/** ISO 시각 → 기기 기준 'HH:MM' */
export function isoToHhmm(iso: string): string {
  const d = new Date(iso);
  return hhmm(minutesOfDay(d));
}

/** '2026-10-18' → '10/18(일)' */
export function shortDate(ymd: string): string {
  const { m, d } = parseYmd(ymd);
  return `${String(m)}/${String(d)}(${WEEKDAYS[weekdayOf(ymd)] ?? ""})`;
}

/** '2026-10-18' → '10월 18일' */
export function koreanMonthDay(ymd: string): string {
  const { m, d } = parseYmd(ymd);
  return `${String(m)}월 ${String(d)}일`;
}

/** '2026-10-18' → '2026년 10월 18일 (일)' */
export function longDate(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  return `${String(y)}년 ${String(m)}월 ${String(d)}일 (${WEEKDAYS[weekdayOf(ymd)] ?? ""})`;
}
