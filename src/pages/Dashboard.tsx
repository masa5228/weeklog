import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { DashboardRow } from "../types";
import {
  addWeeks,
  currentWeekStart,
  formatDateTime,
  formatWeekRange,
  isCurrentWeekOrLater,
} from "../lib/week";
import {
  card,
  colors,
  container,
  page,
  secondaryButton,
} from "../styles";

export function Dashboard() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => currentWeekStart());
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nextDisabled = useMemo(
    () => isCurrentWeekOrLater(weekStart),
    [weekStart],
  );

  const load = useCallback(async (monday: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("manager_reports")
      .select("id, member_id, week_start, status, submitted_at, display_name")
      .eq("week_start", monday)
      .order("display_name", { ascending: true });
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as DashboardRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(weekStart);
  }, [weekStart, load]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div style={page}>
      <div style={container}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h1 style={{ fontSize: 20, margin: 0 }}>週報一覧</h1>
          <button style={secondaryButton} onClick={signOut}>
            ログアウト
          </button>
        </header>

        <div
          style={{
            ...card,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "12px 16px",
          }}
        >
          <button
            style={secondaryButton}
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          >
            ‹ 前の週
          </button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {formatWeekRange(weekStart)}
          </span>
          <button
            style={{
              ...secondaryButton,
              opacity: nextDisabled ? 0.4 : 1,
              cursor: nextDisabled ? "not-allowed" : "pointer",
            }}
            disabled={nextDisabled}
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            次の週 ›
          </button>
        </div>

        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {loading ? (
            <p style={{ padding: 24, color: colors.muted, textAlign: "center" }}>
              読み込み中...
            </p>
          ) : error ? (
            <p style={{ padding: 24, color: colors.danger }}>{error}</p>
          ) : rows.length === 0 ? (
            <p style={{ padding: 24, color: colors.muted, textAlign: "center" }}>
              この週の週報はまだありません。
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.bg }}>
                  <Th>氏名</Th>
                  <Th>状態</Th>
                  <Th>提出日時</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/report/${r.id}`)}
                    style={{
                      cursor: "pointer",
                      borderTop: `1px solid ${colors.border}`,
                    }}
                  >
                    <Td>{r.display_name}</Td>
                    <Td>
                      <StatusBadge submitted={r.status === "submitted"} />
                    </Td>
                    <Td>{formatDateTime(r.submitted_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "12px 16px",
        fontSize: 13,
        color: colors.muted,
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "14px 16px", fontSize: 15 }}>{children}</td>;
}

function StatusBadge({ submitted }: { submitted: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: submitted ? colors.success : colors.pending,
        background: submitted ? colors.successBg : colors.pendingBg,
      }}
    >
      {submitted ? "提出済" : "未提出"}
    </span>
  );
}
