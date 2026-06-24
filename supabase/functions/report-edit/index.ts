import { serviceClient } from "../_shared/supabase.ts";
import { error, handleOptions, json } from "../_shared/http.ts";

const SELECT_COLUMNS =
  "id, token, week_start, tasks_draft, issues_draft, solutions_draft, ai_coaching, tasks_final, issues_final, solutions_final, comments, status, submitted_at, member:members!inner(display_name)";

interface ReportRow {
  id: string;
  token: string;
  week_start: string;
  tasks_draft: string | null;
  issues_draft: string | null;
  solutions_draft: string | null;
  ai_coaching: string | null;
  tasks_final: string | null;
  issues_final: string | null;
  solutions_final: string | null;
  comments: string | null;
  status: string;
  submitted_at: string | null;
  member: { display_name: string } | null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const supabase = serviceClient();

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token");
    if (!token) return error("token が必要です", 400);

    const { data, error: dbError } = await supabase
      .from("weekly_reports")
      .select(SELECT_COLUMNS)
      .eq("token", token)
      .maybeSingle();

    if (dbError) return error(dbError.message, 500);
    if (!data) return error("週報が見つかりません", 404);

    const row = data as unknown as ReportRow;
    const { member, ...rest } = row;
    return json({ ...rest, display_name: member?.display_name ?? "" });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return error("不正なリクエストです", 400);
    }

    const token = typeof body.token === "string" ? body.token : null;
    if (!token) return error("token が必要です", 400);

    const { data: existing, error: findError } = await supabase
      .from("weekly_reports")
      .select("id, status")
      .eq("token", token)
      .maybeSingle();

    if (findError) return error(findError.message, 500);
    if (!existing) return error("週報が見つかりません", 404);
    if (existing.status === "submitted") {
      return error("すでに提出済みです", 409);
    }

    const asText = (key: string): string =>
      typeof body[key] === "string" ? (body[key] as string) : "";

    // status='draft' 条件付き更新で二重提出を原子的に防ぐ（更新0件 = 既に提出済み）。
    const { data: updated, error: updateError } = await supabase
      .from("weekly_reports")
      .update({
        tasks_final: asText("tasks_final"),
        issues_final: asText("issues_final"),
        solutions_final: asText("solutions_final"),
        comments: asText("comments"),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("token", token)
      .eq("status", "draft")
      .select("id");

    if (updateError) return error(updateError.message, 500);
    if (!updated || updated.length === 0) {
      return error("すでに提出済みです", 409);
    }
    return json({ ok: true });
  }

  return error("Method Not Allowed", 405);
});
