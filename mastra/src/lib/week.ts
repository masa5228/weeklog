const DAY_MS = 86_400_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

export function jstWeekStart(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const day = jst.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(jst.getTime() + diff * DAY_MS);
  return isoDate(monday);
}

export function weekdayRange(weekStart: string): { start: string; end: string } {
  const monday = new Date(`${weekStart}T00:00:00Z`);
  const friday = new Date(monday.getTime() + 4 * DAY_MS);
  return { start: weekStart, end: isoDate(friday) };
}

export function formatLogDate(logDate: string): string {
  const d = new Date(`${logDate}T00:00:00Z`);
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
}
