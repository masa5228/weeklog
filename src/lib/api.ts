import type { EditableReport } from "../types";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
};

export async function fetchReportByToken(token: string): Promise<EditableReport> {
  const res = await fetch(
    `${FUNCTIONS_BASE}/report-edit?token=${encodeURIComponent(token)}`,
    { headers },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `読み込みに失敗しました (${res.status})`);
  }
  return res.json();
}

export interface SubmitPayload {
  token: string;
  tasks_final: string;
  issues_final: string;
  solutions_final: string;
  comments: string;
}

export async function submitReport(payload: SubmitPayload): Promise<void> {
  const res = await fetch(`${FUNCTIONS_BASE}/report-edit`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `提出に失敗しました (${res.status})`);
  }
}
