import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { MemberLogs, ReportDraft } from "./supabase";
import { formatLogDate } from "./week";

const MODEL_ID = "gemini-2.5-flash";
const MAX_RETRIES = 2;

const reportSchema = z.object({
  tasks: z.string(),
  issues: z.string(),
  solutions: z.string(),
  coaching: z.string(),
});

function renderLogs(member: MemberLogs): string {
  return member.logs
    .map((log) => {
      const lines = [`【${formatLogDate(log.log_date)}】`];
      lines.push(`やったこと: ${log.tasks}`);
      lines.push(`課題: ${log.issues ?? "なし"}`);
      lines.push(`課題解決: ${log.solutions ?? "なし"}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildPrompt(member: MemberLogs, retryNote: string): string {
  return `あなたはチームの週報作成を支援するアシスタントです。
以下は ${member.displayName} さんの今週（月〜金）の日次ログです。

${renderLogs(member)}

このログをもとに、週報の下書きを作成してください。

出力する4つのフィールド:
- tasks（やったこと）: 今週の業務を簡潔にまとめる。箇条書き可。
- issues（課題）: 直面した課題を整理する。ログに課題がなければ「特になし」とする。
- solutions（課題解決）: 課題への対処・解決策をまとめる。なければ「特になし」とする。
- coaching（AIからのヒント）: 本人だけが読む振り返りのヒント。次の方針で書く。
  - 課題の粒度が大きすぎる／小さすぎる場合に、適切な粒度への気づきを促す
  - 解決策が対症療法にとどまる場合に、根本原因への視点を促す
  - 必ず問いかけ・提案の形式にする（断定・評価・指示はしない）
  - 該当がなければ「今週は課題と解決策のバランスが取れています」等の肯定的なコメントにする
  - 100〜150文字程度

tasks は必ず内容を埋めてください（空欄にしない）。${retryNote}`;
}

function fallbackDraft(member: MemberLogs): ReportDraft {
  const tasks = member.logs
    .map((log) => `${formatLogDate(log.log_date)}: ${log.tasks}`)
    .join("\n");
  const issues = member.logs
    .filter((log) => log.issues)
    .map((log) => `${formatLogDate(log.log_date)}: ${log.issues}`)
    .join("\n");
  const solutions = member.logs
    .filter((log) => log.solutions)
    .map((log) => `${formatLogDate(log.log_date)}: ${log.solutions}`)
    .join("\n");
  return {
    tasks: tasks || "（記録なし）",
    issues: issues || "特になし",
    solutions: solutions || "特になし",
    coaching: "今週の振り返りをもとに、来週の重点を一つ決めてみましょう。",
  };
}

export async function generateDraft(member: MemberLogs): Promise<ReportDraft> {
  let retryNote = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { object } = await generateObject({
        model: google(MODEL_ID),
        schema: reportSchema,
        prompt: buildPrompt(member, retryNote),
      });
      if (!object.tasks.trim()) {
        throw new Error("tasks が空です");
      }
      return object;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      retryNote = `\n\n前回の生成は次の理由で失敗しました。修正して再生成してください: ${message}`;
    }
  }
  return fallbackDraft(member);
}
