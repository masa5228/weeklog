export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が設定されていません`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name];
}
