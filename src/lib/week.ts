// 週の計算はすべて JST 基準。weekStart は JST の月曜日を 'YYYY-MM-DD' で表す。
// DB の weekly_reports.week_start（mastra が JST で算出）と一致させるため、
// ブラウザのローカルタイムゾーンに依存しない実装にする。

const DAY_MS = 86_400_000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}`;
}

function parseWeekStart(weekStart: string): Date {
  return new Date(`${weekStart}T00:00:00Z`);
}

export function currentWeekStart(): string {
  const jst = new Date(Date.now() + JST_OFFSET_MS);
  const day = jst.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(jst.getTime() + diff * DAY_MS);
  return isoUtc(monday);
}

export function addWeeks(weekStart: string, weeks: number): string {
  return isoUtc(new Date(parseWeekStart(weekStart).getTime() + weeks * 7 * DAY_MS));
}

export function isCurrentWeekOrLater(weekStart: string): boolean {
  return weekStart >= currentWeekStart();
}

export function formatWeekRange(weekStart: string): string {
  const monday = parseWeekStart(weekStart);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const start = `${monday.getUTCFullYear()}/${pad(monday.getUTCMonth() + 1)}/${pad(
    monday.getUTCDate(),
  )} (${WEEKDAY_JP[monday.getUTCDay()]})`;
  const end = `${pad(sunday.getUTCMonth() + 1)}/${pad(sunday.getUTCDate())} (${
    WEEKDAY_JP[sunday.getUTCDay()]
  })`;
  return `${start} 〜 ${end}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}/${pad(jst.getUTCMonth() + 1)}/${pad(
    jst.getUTCDate(),
  )} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`;
}
