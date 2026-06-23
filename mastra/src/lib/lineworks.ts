import { createSign } from "node:crypto";
import { requireEnv } from "./env";

const AUTH_URL = "https://auth.worksmobile.com/oauth2/v2.0/token";
const API_BASE = "https://www.worksapis.com/v1.0";

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildAssertion(): string {
  const clientId = requireEnv("LINE_WORKS_CLIENT_ID");
  const serviceAccount = requireEnv("LINE_WORKS_SERVICE_ACCOUNT");
  const privateKey = requireEnv("LINE_WORKS_PRIVATE_KEY").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: clientId,
      sub: serviceAccount,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    assertion: buildAssertion(),
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    client_id: requireEnv("LINE_WORKS_CLIENT_ID"),
    client_secret: requireEnv("LINE_WORKS_CLIENT_SECRET"),
    scope: "bot",
  });
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`LINE WORKS 認証に失敗 (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function sendTextMessage(
  userId: string,
  text: string,
): Promise<void> {
  const botId = requireEnv("LINE_WORKS_BOT_ID");
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/bots/${botId}/users/${userId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: { type: "text", text } }),
  });
  if (!res.ok) {
    throw new Error(
      `LINE WORKS 送信に失敗 (${res.status}): ${await res.text()}`,
    );
  }
}
