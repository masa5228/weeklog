import type { VercelRequest, VercelResponse } from "@vercel/node";
import { mastra } from "@weeklog/mastra";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const secret = process.env.INTERNAL_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const weekStart =
    typeof req.body?.weekStart === "string" ? req.body.weekStart : undefined;

  try {
    const workflow = mastra.getWorkflow("generateReport");
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: weekStart ? { weekStart } : {},
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
