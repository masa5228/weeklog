import { Mastra } from "@mastra/core/mastra";
import { generateReportWorkflow } from "./workflows/generate-report";

export const mastra = new Mastra({
  workflows: { generateReport: generateReportWorkflow },
});

export { generateReportWorkflow };
