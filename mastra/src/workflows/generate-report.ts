import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { requireEnv } from "../lib/env";
import { generateDraft } from "../lib/gemini";
import { sendTextMessage } from "../lib/lineworks";
import { fetchWeekLogs, upsertReport, type MemberLogs } from "../lib/supabase";
import { jstWeekStart } from "../lib/week";

const inputSchema = z.object({
  weekStart: z.string().optional(),
});

const outputSchema = z.object({
  weekStart: z.string(),
  members: z.number(),
  generated: z.number(),
  notified: z.number(),
  failures: z.array(z.string()),
});

interface MemberResult {
  generated: boolean;
  notified: boolean;
  failures: string[];
}

function editMessage(appUrl: string, token: string): string {
  return [
    "今週の週報下書きができました。",
    "こちらから内容を確認・編集して提出してください。",
    `${appUrl.replace(/\/$/, "")}/edit/${token}`,
  ].join("\n");
}

async function processMember(
  member: MemberLogs,
  weekStart: string,
  appUrl: string,
): Promise<MemberResult> {
  const failures: string[] = [];
  let token: string;
  try {
    const draft = await generateDraft(member);
    token = await upsertReport(member.memberId, weekStart, draft);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      generated: false,
      notified: false,
      failures: [`生成失敗 (${member.displayName}): ${message}`],
    };
  }

  try {
    await sendTextMessage(member.lineWorksUserId, editMessage(appUrl, token));
    return { generated: true, notified: true, failures };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`通知失敗 (${member.displayName}): ${message}`);
    return { generated: true, notified: false, failures };
  }
}

const generateAndNotify = createStep({
  id: "generate-and-notify",
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const weekStart = inputData.weekStart ?? jstWeekStart();
    const appUrl = requireEnv("APP_URL");
    const members = await fetchWeekLogs(weekStart);

    const results = await Promise.all(
      members.map((member) => processMember(member, weekStart, appUrl)),
    );

    return {
      weekStart,
      members: members.length,
      generated: results.filter((r) => r.generated).length,
      notified: results.filter((r) => r.notified).length,
      failures: results.flatMap((r) => r.failures),
    };
  },
});

export const generateReportWorkflow = createWorkflow({
  id: "generateReport",
  inputSchema,
  outputSchema,
})
  .then(generateAndNotify)
  .commit();
