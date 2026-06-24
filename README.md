# WeekLog

LINE WORKS Bot で日次ログを収集し、AI（Gemini 2.5 Flash）が週報の下書きを自動生成するチーム週報支援ツール。

設計の詳細は [`CLAUDE.md`](./CLAUDE.md) を参照。

## 構成

| 領域 | 技術 | 場所 |
|------|------|------|
| フロントエンド | React + TypeScript + Vite + React Router | `src/` |
| 週報生成 | Mastra ワークフロー + Gemini 2.5 Flash | `mastra/` |
| 生成 API | Vercel Serverless Function | `api/generate-reports.ts` |
| Bot / 編集 API | Supabase Edge Functions (Deno) | `supabase/functions/` |
| DB | Supabase PostgreSQL (RLS) | `supabase/migrations/` |
| スケジュール | GitHub Actions (cron) | `.github/workflows/` |

> **AI モデル**: 当初設計の Claude API ではなく **Gemini 2.5 Flash**（`@ai-sdk/google`）を使用。
> 環境変数は `GOOGLE_GENERATIVE_AI_API_KEY`。

## セットアップ

```bash
npm install              # ルート + mastra ワークスペースを一括インストール
cp .env.example .env.local   # フロントエンドの Supabase 接続情報
```

## 開発コマンド

```bash
npm run dev              # フロントエンド開発サーバー
npm run build            # 型チェック + フロントエンドビルド
npm run typecheck        # frontend + api の型チェック
npm run typecheck:mastra # mastra の型チェック
```

Edge Functions（Deno）:

```bash
deno check supabase/functions/**/index.ts
```

## 環境変数

### フロントエンド（`.env.local`）
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functions シークレット
- `LINE_WORKS_BOT_ID` / `LINE_WORKS_BOT_SECRET`
- `LINE_WORKS_CLIENT_ID` / `LINE_WORKS_CLIENT_SECRET`
- `LINE_WORKS_SERVICE_ACCOUNT` / `LINE_WORKS_PRIVATE_KEY`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（自動注入される場合あり）

### Mastra / Vercel
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`（編集 URL 生成用。例: `https://your-app.vercel.app`）
- `INTERNAL_SECRET`
- 上記 LINE WORKS 一式

### GitHub Actions シークレット
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_URL` / `INTERNAL_SECRET`

## 残作業（最後にユーザー側で実施）

1. **API キー・シークレット登録**: 上記環境変数を各サービスに設定。
2. **CD**: Vercel 自動デプロイ、Supabase Functions / migration の自動デプロイ。
3. **Google OAuth の組織制限**: 現状は「認証済みユーザー = マネージャー」前提。
   Supabase Auth 側で許可ドメインを絞ること。
4. **メンバー表示名**: Bot 初回受信時は `display_name` に userId を仮置きする。
   正式名称は DB で更新するか、LINE WORKS Directory API 連携を追加する。
