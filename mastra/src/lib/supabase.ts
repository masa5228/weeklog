import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import { weekdayRange } from "./week";

export interface DailyLog {
  log_date: string;
  tasks: string;
  issues: string | null;
  solutions: string | null;
}

export interface MemberLogs {
  memberId: string;
  lineWorksUserId: string;
  displayName: string;
  logs: DailyLog[];
}

export interface ReportDraft {
  tasks: string;
  issues: string;
  solutions: string;
  coaching: string;
}

let client: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (client) return client;
  client = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
  return client;
}

interface LogRow {
  log_date: string;
  tasks: string;
  issues: string | null;
  solutions: string | null;
  member: {
    id: string;
    line_works_user_id: string;
    display_name: string;
  } | null;
}

export async function fetchWeekLogs(weekStart: string): Promise<MemberLogs[]> {
  const { start, end } = weekdayRange(weekStart);
  const { data, error } = await serviceClient()
    .from("daily_logs")
    .select(
      "log_date, tasks, issues, solutions, member:members!inner(id, line_works_user_id, display_name)",
    )
    .gte("log_date", start)
    .lte("log_date", end)
    .order("log_date", { ascending: true });

  if (error) throw new Error(`daily_logs の取得に失敗: ${error.message}`);

  const byMember = new Map<string, MemberLogs>();
  for (const row of (data ?? []) as unknown as LogRow[]) {
    if (!row.member) continue;
    const existing = byMember.get(row.member.id);
    const log: DailyLog = {
      log_date: row.log_date,
      tasks: row.tasks,
      issues: row.issues,
      solutions: row.solutions,
    };
    if (existing) {
      existing.logs.push(log);
    } else {
      byMember.set(row.member.id, {
        memberId: row.member.id,
        lineWorksUserId: row.member.line_works_user_id,
        displayName: row.member.display_name,
        logs: [log],
      });
    }
  }
  return [...byMember.values()];
}

export async function upsertReport(
  memberId: string,
  weekStart: string,
  draft: ReportDraft,
): Promise<string> {
  const token = crypto.randomUUID();
  const { data, error } = await serviceClient()
    .from("weekly_reports")
    .upsert(
      {
        member_id: memberId,
        week_start: weekStart,
        token,
        tasks_draft: draft.tasks,
        issues_draft: draft.issues,
        solutions_draft: draft.solutions,
        ai_coaching: draft.coaching,
        status: "draft",
      },
      { onConflict: "member_id,week_start" },
    )
    .select("token")
    .single();

  if (error) throw new Error(`weekly_reports の保存に失敗: ${error.message}`);
  return (data as { token: string }).token;
}
