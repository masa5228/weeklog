import { serviceClient } from "../_shared/supabase.ts";
import { sendTextMessage } from "../_shared/lineworks.ts";
import { json } from "../_shared/http.ts";

const PROMPT = [
  "お疲れさまです。本日の業務ログを記録します。",
  "今日やったことを教えてください。",
].join("\n");

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabase = serviceClient();
  const { data: members, error } = await supabase
    .from("members")
    .select("id, line_works_user_id");

  if (error) return json({ error: error.message }, 500);

  const results = await Promise.all(
    (members ?? []).map(async (member) => {
      await supabase
        .from("bot_sessions")
        .upsert(
          { member_id: member.id, step: 1, tasks_temp: null, issues_temp: null },
          { onConflict: "member_id" },
        );
      try {
        await sendTextMessage(member.line_works_user_id, PROMPT);
        return { ok: true, failure: null as string | null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, failure: `${member.line_works_user_id}: ${message}` };
      }
    }),
  );

  return json({
    members: members?.length ?? 0,
    sent: results.filter((r) => r.ok).length,
    failures: results.flatMap((r) => (r.failure ? [r.failure] : [])),
  });
});
