export type ReportStatus = "draft" | "submitted";

export interface Member {
  id: string;
  line_works_user_id: string;
  display_name: string;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  member_id: string;
  week_start: string;
  token: string;
  tasks_draft: string | null;
  issues_draft: string | null;
  solutions_draft: string | null;
  ai_coaching: string | null;
  tasks_final: string | null;
  issues_final: string | null;
  solutions_final: string | null;
  comments: string | null;
  status: ReportStatus;
  submitted_at: string | null;
  created_at: string;
}

export type DashboardRow = Pick<
  WeeklyReport,
  "id" | "member_id" | "week_start" | "status" | "submitted_at"
> & { display_name: string };

export type ReportDetail = Pick<
  WeeklyReport,
  | "id"
  | "week_start"
  | "tasks_final"
  | "issues_final"
  | "solutions_final"
  | "comments"
  | "status"
  | "submitted_at"
> & { display_name: string };

// report-edit Edge Function のレスポンス（member_id / created_at を除く全列 + display_name）。
export type EditableReport = Omit<WeeklyReport, "member_id" | "created_at"> & {
  display_name: string;
};
