import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchReportByToken, submitReport } from "../lib/api";
import type { EditableReport } from "../types";
import { formatWeekRange } from "../lib/week";
import {
  card,
  colors,
  container,
  label,
  page,
  primaryButton,
  textarea,
} from "../styles";

function coalesce(final: string | null, draft: string | null): string {
  if (final !== null && final !== undefined) return final;
  return draft ?? "";
}

export function ReportEdit() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<EditableReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [tasks, setTasks] = useState("");
  const [issues, setIssues] = useState("");
  const [solutions, setSolutions] = useState("");
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchReportByToken(token)
      .then((r) => {
        setReport(r);
        setTasks(coalesce(r.tasks_final, r.tasks_draft));
        setIssues(coalesce(r.issues_final, r.issues_draft));
        setSolutions(coalesce(r.solutions_final, r.solutions_draft));
        setComments(r.comments ?? "");
        if (r.status === "submitted") setDone(true);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        token,
        tasks_final: tasks,
        issues_final: issues,
        solutions_final: solutions,
        comments,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={container}>
          <p style={{ color: colors.muted }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={card}>
            <p style={{ color: colors.danger, margin: 0 }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div style={page}>
      <div style={container}>
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>週報の編集・提出</h1>
          <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>
            {report.display_name}・{formatWeekRange(report.week_start)}
          </p>
        </header>

        {done ? (
          <div style={{ ...card, textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, margin: "8px 0" }}>
              提出済みです ✓
            </p>
            <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>
              ご提出ありがとうございました。再提出はできません。
            </p>
          </div>
        ) : (
          <>
            {report.ai_coaching && (
              <div
                style={{
                  ...card,
                  background: colors.accentBg,
                  borderColor: "#cfe0ff",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    margin: "0 0 8px",
                    color: colors.primary,
                    fontWeight: 700,
                  }}
                >
                  AIからのヒント
                </h2>
                <p
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    fontSize: 14,
                  }}
                >
                  {report.ai_coaching}
                </p>
              </div>
            )}

            <Field label="やったこと" value={tasks} onChange={setTasks} />
            <Field label="課題" value={issues} onChange={setIssues} />
            <Field label="課題解決" value={solutions} onChange={setSolutions} />
            <Field label="所管" value={comments} onChange={setComments} />

            {error && (
              <p style={{ color: colors.danger, fontSize: 14 }}>{error}</p>
            )}

            <button
              style={{
                ...primaryButton,
                width: "100%",
                marginTop: 8,
                opacity: submitting ? 0.6 : 1,
              }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "提出中..." : "提出する"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label: title,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={label}>{title}</label>
      <textarea
        style={textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
