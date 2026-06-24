import type { CSSProperties } from "react";

export const colors = {
  bg: "#f5f6f8",
  surface: "#ffffff",
  border: "#e2e5ea",
  text: "#1f2733",
  muted: "#6b7585",
  primary: "#2f6df6",
  primaryText: "#ffffff",
  accentBg: "#eef3ff",
  success: "#1f9d63",
  successBg: "#e7f6ee",
  pending: "#9aa3b2",
  pendingBg: "#f0f2f5",
  danger: "#d0463b",
};

export const page: CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', Meiryo, sans-serif",
};

export const container: CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "24px 16px 64px",
};

export const card: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 20,
};

export const primaryButton: CSSProperties = {
  background: colors.primary,
  color: colors.primaryText,
  border: "none",
  borderRadius: 8,
  padding: "12px 20px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  background: colors.surface,
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 14,
  cursor: "pointer",
};

export const label: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: colors.muted,
  marginBottom: 6,
  display: "block",
};

export const textarea: CSSProperties = {
  width: "100%",
  minHeight: 110,
  padding: 12,
  fontSize: 15,
  lineHeight: 1.6,
  color: colors.text,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  resize: "vertical",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
