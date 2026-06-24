import { serviceClient } from "../_shared/supabase.ts";
import { sendTextMessage } from "../_shared/lineworks.ts";

const IDLE_MESSAGE = [
  "このBotは業務ログの記録専用です。",
  "毎日17:30に記録のお声がけをします。",
  "ご質問があれば上長にお問い合わせください。",
].join("\n");

const ASK_ISSUES = "課題はありましたか？なければ「なし」と送ってください。";
const ASK_SOLUTIONS = "解決策・対処はありましたか？なければ「なし」と送ってください。";
const DONE = "記録しました ✓";

const encoder = new TextEncoder();

function utf8(input: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(input));
}

function jstToday(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeOptional(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "なし" ? null : trimmed;
}

async function verifySignature(
  raw: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    utf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, utf8(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

interface WebhookEvent {
  type?: string;
  source?: { userId?: string };
  content?: { type?: string; text?: string };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const raw = await req.text();
  const secret = Deno.env.get("LINE_WORKS_BOT_SECRET");
  if (!secret) return new Response("Server misconfigured", { status: 500 });

  const signature = req.headers.get("X-WORKS-Signature");
  if (!(await verifySignature(raw, signature, secret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const userId = event.source?.userId;
  if (event.type !== "message" || event.content?.type !== "text" || !userId) {
    return new Response("ok");
  }
  const text = event.content.text ?? "";

  try {
    await handleMessage(userId, text);
  } catch (err) {
    console.error("webhook error:", err);
  }
  return new Response("ok");
});

async function handleMessage(userId: string, text: string): Promise<void> {
  const supabase = serviceClient();

  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("line_works_user_id", userId)
    .maybeSingle();

  let memberId: string;
  if (existing) {
    memberId = existing.id;
  } else {
    const { data, error } = await supabase
      .from("members")
      .insert({ line_works_user_id: userId, display_name: userId })
      .select("id")
      .single();
    if (error || !data) throw new Error(`member 登録に失敗: ${error?.message}`);
    memberId = data.id;
  }

  const { data: session } = await supabase
    .from("bot_sessions")
    .select("step, tasks_temp, issues_temp")
    .eq("member_id", memberId)
    .maybeSingle();

  const step = session?.step ?? 0;

  if (step === 1) {
    await supabase
      .from("bot_sessions")
      .upsert(
        { member_id: memberId, step: 2, tasks_temp: text.trim() },
        { onConflict: "member_id" },
      );
    await sendTextMessage(userId, ASK_ISSUES);
    return;
  }

  if (step === 2) {
    await supabase
      .from("bot_sessions")
      .upsert(
        { member_id: memberId, step: 3, issues_temp: text },
        { onConflict: "member_id" },
      );
    await sendTextMessage(userId, ASK_SOLUTIONS);
    return;
  }

  if (step === 3) {
    await supabase.from("daily_logs").upsert(
      {
        member_id: memberId,
        log_date: jstToday(),
        tasks: (session?.tasks_temp ?? "").trim() || "（記録なし）",
        issues: normalizeOptional(session?.issues_temp ?? ""),
        solutions: normalizeOptional(text),
      },
      { onConflict: "member_id,log_date" },
    );
    await supabase
      .from("bot_sessions")
      .upsert(
        { member_id: memberId, step: 0, tasks_temp: null, issues_temp: null },
        { onConflict: "member_id" },
      );
    await sendTextMessage(userId, DONE);
    return;
  }

  await sendTextMessage(userId, IDLE_MESSAGE);
}
