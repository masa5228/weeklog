# WeekLog プロジェクト

LINE WORKSのBotで日次ログを収集し、AIが週報の下書きを自動生成するチーム週報支援ツール。

## このファイルの使い方

- **設計・仕様**: Sonnetセッションで決定済み。このCLAUDE.mdが引き継ぎ書
- **実装**: このディレクトリで起動したOpusが担当
- 実装開始前に全文を読むこと

---

## プロジェクト概要

- メンバー（約20名）が平日17:30にLINE WORKS Botから日次ログをラリー形式で入力
- 金曜21:00にMastraワークフローが週報下書きを自動生成
- BotがメンバーにワンタイムURLを送信 → メンバーがWebフォームで編集・提出
- マネージャーがWebダッシュボード（Googleログイン）で20名分の週報を閲覧

---

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite + React Router
- **週報生成ワークフロー**: Mastra（Vercel serverless）
- **AI**: Gemini 2.5 Flash（`@ai-sdk/google`、structured output使用）
- **Bot**: LINE WORKS Bot API
- **バックエンド**: Supabase Edge Functions（Deno/TypeScript）
- **DB**: Supabase PostgreSQL（RLS有効）
- **認証**: Supabase Auth（Google OAuth）※マネージャーのみ
- **ホスティング**: Vercel
- **CI/CD**: GitHub Actions（cron trigger）

---

## ディレクトリ構成

```
src/
  pages/
    Login.tsx           # Googleログイン画面
    Dashboard.tsx       # 週報一覧（マネージャー）
    ReportDetail.tsx    # 週報詳細（マネージャー）
    ReportEdit.tsx      # 週報編集・提出（メンバー・ワンタイムURL）
  components/
  lib/
    supabase.ts
  types/
    index.ts
mastra/
  src/
    workflows/
      generate-report.ts  # 週報生成ワークフロー（メイン）
    index.ts
  package.json
supabase/
  functions/
    lineworks-webhook/    # Bot メッセージ受信
    send-daily-prompt/    # 平日17:30 プロンプト送信
    _shared/
      lineworks.ts        # LINE WORKS API クライアント
      http.ts
  migrations/
.github/
  workflows/
    daily-prompt.yml      # 平日17:30（JST）にsend-daily-promptを呼ぶ
    weekly-generate.yml   # 金曜21:00（JST）にMastraワークフローを呼ぶ
```

---

## DB設計

### members
```sql
id                  uuid primary key default gen_random_uuid()
line_works_user_id  text unique not null
display_name        text not null
created_at          timestamptz default now()
```

### daily_logs
```sql
id          uuid primary key default gen_random_uuid()
member_id   uuid references members(id) not null
log_date    date not null
tasks       text not null   -- やったこと（必須）
issues      text            -- 課題（任意・「なし」はNULL）
solutions   text            -- 課題解決（任意・「なし」はNULL）
created_at  timestamptz default now()
unique(member_id, log_date)
```

### bot_sessions
```sql
id          uuid primary key default gen_random_uuid()
member_id   uuid references members(id) not null unique
step        int default 0   -- 0: idle, 1: tasks待ち, 2: issues待ち, 3: solutions待ち
tasks_temp  text
issues_temp text
updated_at  timestamptz default now()
```

### weekly_reports
```sql
id              uuid primary key default gen_random_uuid()
member_id       uuid references members(id) not null
week_start      date not null               -- その週の月曜日
token           text unique not null        -- ワンタイムURL用（gen_random_uuid()）
tasks_draft     text                        -- AI生成
issues_draft    text
solutions_draft text
ai_coaching     text                        -- AIコーチング（メンバーのみ表示・マネージャーには非公開）
tasks_final     text                        -- メンバー編集後
issues_final    text
solutions_final text
comments        text                        -- 所管
status          text default 'draft'        -- draft | submitted
submitted_at    timestamptz
created_at      timestamptz default now()
unique(member_id, week_start)
```

---

## 画面設計

### 画面1：ログイン（/login）
- Googleログインボタンのみ
- ログイン後 → /dashboard

### 画面2：週報一覧（/dashboard）※マネージャーのみ
- **週ナビゲーション（ページャー形式）**
  ```
  < 前の週    2026/06/16 (月) 〜 06/22 (日)    次の週 >
  ```
  - デフォルト：アクセス時点の今週（月曜〜日曜）を表示
  - 「次の週」ボタンは今週が上限（それ以降は非活性）
  - 週の区切り：月曜始め・日曜締め
  - week_startはDBの`weekly_reports.week_start`（月曜日の日付）と対応
  - 表示形式：`YYYY/MM/DD (月) 〜 MM/DD (日)`
- **テーブル**：氏名 / 状態（提出済・未提出）/ 提出日時
- 行タップ → /report/:id

### 画面3：週報詳細（/report/:id）※マネージャーのみ
- メンバー名 + 対象週
- やったこと / 課題 / 課題解決 / 所管 を読み取り専用表示

### 画面4：週報編集・提出（/edit/:token）※認証不要
- ワンタイムトークンでweekly_reportsを特定
- **AIからのヒント**（ai_coaching）を読み取り専用パネルで表示（マネージャーには非公開・この画面にのみ表示）
  - トーン：問いかけ形式。「〜ではないでしょうか」ではなく「〜という視点も持つと来週に活かせるかもしれません」
  - 課題の粒度・解決策の具体性・根本原因への言及が薄い場合にヒントを出す
- 4フィールド編集可能テキストエリア（やったこと・課題・課題解決・所管）
- 提出ボタン → status: submitted に更新
- 提出済みの場合は「提出済みです」と表示（再提出不可）

### 重要：ai_coachingの非公開ルール
- Dashboard・ReportDetailはai_coachingフィールドをAPIレスポンスに含めない
- Supabaseのクエリで明示的にai_coachingを除外するか、マネージャー用のviewを作る
- ReportEdit（/edit/:token）のみai_coachingを取得・表示する

---

## Mastraワークフロー設計（generate-report.ts）

金曜21:00にGitHub Actionsから `/api/generate-reports` エンドポイント経由で呼ばれる。

```
Step 1: Supabaseから今週（月〜金）の全メンバーのdaily_logsを取得

Step 2（メンバーごとに並列）:
  2a. Gemini 2.5 Flashで週報下書きを生成（structured output）
      スキーマ: { tasks: string, issues: string, solutions: string, coaching: string }
      プロンプト: 日次ログ一覧 + 週報4フィールド生成指示 + コーチング指示
      コーチング指示の方針:
        - 課題の粒度が大きすぎる・小さすぎる場合にヒントを出す
        - 解決策が対症療法にとどまる場合に根本原因への視点を促す
        - 問いかけ形式で書く（断定・評価はしない）
        - 該当がない場合は「今週は課題と解決策のバランスが取れています」等の肯定的なコメントにする
        - 100〜150文字程度

  2b. バリデーション
      - 全フィールドが文字列であること
      - tasksが空でないこと
      - NG → エラー内容をプロンプトに含めてリトライ（最大2回）

  2c. フォールバック（2回失敗時）
      AIまとめをあきらめ、日次ログを日付付きで列挙して各フィールドに格納
      例）tasks: "06/16: A案件仕様書\n06/17: B社MTG\n..."

Step 3: weekly_reportsにupsert（token = gen_random_uuid()）

Step 4: LINE WORKS Bot APIで各メンバーにDM送信
  「今週の週報下書きができました。こちらから編集・提出してください。
   https://<VERCEL_URL>/edit/<token>」
```

---

## LINE WORKS Bot設計

### 日次プロンプト（平日17:30）
send-daily-promptがmembersテーブルの全員に送信してbot_sessionsのstepを1にセット。

### メッセージ受信（lineworks-webhook）
bot_sessionsのstepで状態管理:

| step | Botの返答 | 次のstep |
|------|---------|---------|
| 1 | 受信→tasks_tempに保存→「課題はありましたか？なければ『なし』」 | 2 |
| 2 | 受信→issues_tempに保存→「解決策・対処は？なければ『なし』」 | 3 |
| 3 | 受信→solutions_tempに保存→daily_logsにINSERT→「記録しました ✓」 | 0 |

「なし」と送られた場合はNULLとして保存。

### 想定外メッセージへの対処

**step=0（待機中）にメッセージを受信した場合**
```
このBotは業務ログの記録専用です。
毎日17:30に記録のお声がけをします。
ご質問があれば上長にお問い合わせください。
```

**ラリー中（step=1〜3）に想定外のメッセージが来た場合**
そのままの文章を回答として受け入れる（メンバーはWebフォームで後から編集可能なため、内容の検証はしない）。

### メンバー自動登録
初回メッセージ受信時にmembersテーブルにupsert（line_works_user_id + display_name）。

---

## GitHub Actions設計

### daily-prompt.yml
```yaml
on:
  schedule:
    - cron: '30 8 * * 1-5'  # UTC 8:30 = JST 17:30 月〜金
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Call send-daily-prompt
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/send-daily-prompt \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### weekly-generate.yml
```yaml
on:
  schedule:
    - cron: '0 12 * * 5'  # UTC 12:00 = JST 21:00 金曜
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Call Mastra workflow
        run: |
          curl -X POST ${{ secrets.VERCEL_URL }}/api/generate-reports \
            -H "Authorization: Bearer ${{ secrets.INTERNAL_SECRET }}"
```

---

## 環境変数

### フロントエンド（.env.local）
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Edge Functionsシークレット
- `LINE_WORKS_BOT_ID`
- `LINE_WORKS_BOT_SECRET`
- `LINE_WORKS_CLIENT_ID`
- `LINE_WORKS_CLIENT_SECRET`
- `LINE_WORKS_SERVICE_ACCOUNT`
- `LINE_WORKS_PRIVATE_KEY`

### Mastra / Vercel環境変数
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `APP_URL`（編集URL生成用・例: https://your-app.vercel.app）
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINE_WORKS_BOT_ID`
- `LINE_WORKS_BOT_SECRET`
- `LINE_WORKS_CLIENT_ID`
- `LINE_WORKS_CLIENT_SECRET`
- `LINE_WORKS_SERVICE_ACCOUNT`
- `LINE_WORKS_PRIVATE_KEY`
- `INTERNAL_SECRET`（GitHub Actionsからの呼び出し認証用）

### GitHub Actionsシークレット
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_URL`
- `INTERNAL_SECRET`
- `SUPABASE_ACCESS_TOKEN`（Edge Functions自動デプロイ用）
- `SUPABASE_PROJECT_ID`

---

## コーディング規約

- コメントは原則書かない
- TypeScript strict モード
- Edge Functions: Deno + jsr:@supabase/supabase-js@2
- フロントエンド: インラインスタイル（CSS-in-JSなし）
- エラーハンドリングはシステム境界（API呼び出し）のみ
- RLS: daily_logs・weekly_reportsはservice_role経由のみ

---

## 実装順序

1. **DB migration**（Supabase）: 4テーブル作成
2. **lineworks-webhook**（Edge Function）: メッセージ受信・ラリー状態管理
3. **send-daily-prompt**（Edge Function）: 全員へのプロンプト送信
4. **Mastraワークフロー**: 週報生成・バリデーション・フォールバック・Bot送信
5. **ReportEdit**（/edit/:token）: メンバー編集・提出画面（最優先）
6. **Login + Dashboard + ReportDetail**: マネージャー画面
7. **GitHub Actions**: cron設定（daily-prompt・weekly-generate）
8. **CI/CD**: Vercel自動デプロイ + Supabase Functions自動デプロイ
