const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mondayOf(d: Date): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

export function currentWeekStart(): Date {
  return mondayOf(new Date());
}

export function addWeeks(monday: Date, weeks: number): Date {
  const result = new Date(monday);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function isCurrentWeekOrLater(monday: Date): boolean {
  return monday.getTime() >= currentWeekStart().getTime();
}

export function formatWeekRange(monday: Date): string {
  const sunday = addWeeks(monday, 1);
  sunday.setDate(sunday.getDate() - 1);
  const start = `${monday.getFullYear()}/${pad(monday.getMonth() + 1)}/${pad(
    monday.getDate(),
  )} (${WEEKDAY_JP[monday.getDay()]})`;
  const end = `${pad(sunday.getMonth() + 1)}/${pad(sunday.getDate())} (${
    WEEKDAY_JP[sunday.getDay()]
  })`;
  return `${start} 〜 ${end}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
