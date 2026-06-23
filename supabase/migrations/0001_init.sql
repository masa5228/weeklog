-- WeekLog 初期スキーマ

create extension if not exists "pgcrypto";

create table members (
  id                 uuid primary key default gen_random_uuid(),
  line_works_user_id text unique not null,
  display_name       text not null,
  created_at         timestamptz default now()
);

create table daily_logs (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid references members(id) not null,
  log_date   date not null,
  tasks      text not null,
  issues     text,
  solutions  text,
  created_at timestamptz default now(),
  unique (member_id, log_date)
);

create table bot_sessions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references members(id) not null unique,
  step        int default 0,
  tasks_temp  text,
  issues_temp text,
  updated_at  timestamptz default now()
);

create table weekly_reports (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid references members(id) not null,
  week_start      date not null,
  token           text unique not null,
  tasks_draft     text,
  issues_draft    text,
  solutions_draft text,
  ai_coaching     text,
  tasks_final     text,
  issues_final    text,
  solutions_final text,
  comments        text,
  status          text default 'draft',
  submitted_at    timestamptz,
  created_at      timestamptz default now(),
  unique (member_id, week_start)
);

create index daily_logs_log_date_idx on daily_logs (log_date);
create index weekly_reports_week_start_idx on weekly_reports (week_start);

-- RLS: 全テーブル service_role 経由のみ（ポリシー未定義 = anon / authenticated は不可）
alter table members enable row level security;
alter table daily_logs enable row level security;
alter table bot_sessions enable row level security;
alter table weekly_reports enable row level security;

-- マネージャー閲覧用ビュー。
-- ai_coaching と token を除外し、base テーブルの RLS をバイパスして
-- 認証済みマネージャーにのみ閲覧を許可する（security definer = ビュー所有者権限で実行）。
create view manager_reports as
select
  wr.id,
  wr.member_id,
  wr.week_start,
  wr.tasks_draft,
  wr.issues_draft,
  wr.solutions_draft,
  wr.tasks_final,
  wr.issues_final,
  wr.solutions_final,
  wr.comments,
  wr.status,
  wr.submitted_at,
  wr.created_at,
  m.display_name
from weekly_reports wr
join members m on m.id = wr.member_id;

revoke all on manager_reports from anon;
grant select on manager_reports to authenticated;
