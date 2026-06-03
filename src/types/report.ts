import type { UserProfile } from './user';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  detail: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
};

export type ReportWithProfiles = Report & {
  reporter: UserProfile | null;
  reportedUser: UserProfile | null;
};
