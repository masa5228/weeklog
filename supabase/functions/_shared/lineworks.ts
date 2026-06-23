const AUTH_URL = "https://auth.worksmobile.com/oauth2/v2.0/token";
const API_BASE = "https://www.worksapis.com/v1.0";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`環境変数 ${name} が未設定です`);
  return value;
}

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8(input: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(input));
}

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function buildAssertion(): Promise<string> {
  const clientId = env("LINE_WORKS_CLIENT_ID");
  const serviceAccount = env("LINE_WORKS_SERVICE_ACCOUNT");
  const pem = env("LINE_WORKS_PRIVATE_KEY").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(
    utf8(
      JSON.stringify({ iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600 }),
    ),
  );
  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    utf8(signingInput),
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    assertion: await buildAssertion(),
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    client_id: env("LINE_WORKS_CLIENT_ID"),
    client_secret: env("LINE_WORKS_CLIENT_SECRET"),
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

export async function sendTextMessage(userId: string, text: string): Promise<void> {
  const botId = env("LINE_WORKS_BOT_ID");
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
    throw new Error(`LINE WORKS 送信に失敗 (${res.status}): ${await res.text()}`);
  }
}
