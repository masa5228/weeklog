import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { ReportDetail as ReportDetailType } from "../types";
import { formatWeekRange } from "../lib/week";
import { card, colors, container, page, secondaryButton } from "../styles";

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("manager_reports")
      .select(
        "id, week_start, display_name, tasks_final, issues_final, solutions_final, comments, status, submitted_at",
      )
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setReport(data as ReportDetailType);
        setLoading(false);
      });
  }, [id]);

  return (
    <div style={page}>
      <div style={container}>
        <button
          style={{ ...secondaryButton, marginBottom: 16 }}
          onClick={() => navigate(-1)}
        >
          ‹ 一覧へ戻る
        </button>

        {loading ? (
          <p style={{ color: colors.muted }}>読み込み中...</p>
        ) : error ? (
          <p style={{ color: colors.danger }}>{error}</p>
        ) : !report ? (
          <p style={{ color: colors.muted }}>週報が見つかりません。</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>
                {report.display_name}
              </h1>
              <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>
                {formatWeekRange(report.week_start)}
                {report.status === "submitted" ? "・提出済" : "・未提出"}
              </p>
            </div>

            <Section title="やったこと" value={report.tasks_final} />
            <Section title="課題" value={report.issues_final} />
            <Section title="課題解決" value={report.solutions_final} />
            <Section title="所管" value={report.comments} />
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, value }: { title: string; value: string | null }) {
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <h2
        style={{
          fontSize: 14,
          color: colors.muted,
          margin: "0 0 8px",
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
        {value && value.trim() ? value : "（記載なし）"}
      </p>
    </div>
  );
}
