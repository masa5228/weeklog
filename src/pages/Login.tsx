import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { card, colors, page, primaryButton } from "../styles";

export function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  async function signIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <div
      style={{
        ...page,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ ...card, width: 360, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, margin: "8px 0 4px" }}>WeekLog</h1>
        <p style={{ color: colors.muted, fontSize: 14, marginBottom: 24 }}>
          マネージャー向け 週報ダッシュボード
        </p>
        <button style={{ ...primaryButton, width: "100%" }} onClick={signIn}>
          Googleでログイン
        </button>
        {error && (
          <p style={{ color: colors.danger, fontSize: 13, marginTop: 16 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
