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

export interface DashboardRow {
  id: string;
  member_id: string;
  week_start: string;
  status: ReportStatus;
  submitted_at: string | null;
  display_name: string;
}

export interface ReportDetail {
  id: string;
  week_start: string;
  display_name: string;
  tasks_final: string | null;
  issues_final: string | null;
  solutions_final: string | null;
  comments: string | null;
  status: ReportStatus;
  submitted_at: string | null;
}

export interface EditableReport {
  id: string;
  token: string;
  week_start: string;
  display_name: string;
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
}
