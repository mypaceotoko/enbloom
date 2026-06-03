import type { ProfileRow } from './profileApi';
import { profileRowToUserProfile } from './profileApi';
import { isSupabaseConfigured, requireSupabaseClient, supabase } from './supabase';
import type { Report, ReportStatus, ReportWithProfiles } from '../types/report';

const localAppStateKey = 'enbloom.appState.v1';
const reportColumns = 'id,reporter_id,reported_user_id,reason,detail,status,reviewed_by,reviewed_at,admin_note,created_at';
const profileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const reportWithProfilesColumns = [
  reportColumns,
  `reporter_profile:profiles!reports_reporter_id_fkey(${profileColumns})`,
  `reported_profile:profiles!reports_reported_user_id_fkey(${profileColumns})`,
].join(',');

type ReportRow = Report;
type ReportRowWithProfiles = ReportRow & {
  reporter_profile?: ProfileRow | ProfileRow[] | null;
  reported_profile?: ProfileRow | ProfileRow[] | null;
};

function readLocalReportedUserIds() {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(localAppStateKey);
    if (!rawValue) return [];
    const parsedValue = JSON.parse(rawValue) as { reportedUserIds?: unknown };
    return Array.isArray(parsedValue.reportedUserIds)
      ? parsedValue.reportedUserIds.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function mapReportWithProfiles(row: ReportRowWithProfiles): ReportWithProfiles {
  const reporter = firstProfile(row.reporter_profile);
  const reportedUser = firstProfile(row.reported_profile);

  return {
    ...row,
    reporter: reporter ? profileRowToUserProfile(reporter) : null,
    reportedUser: reportedUser ? profileRowToUserProfile(reportedUser) : null,
  };
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function reportUser(targetUserId: string, reason: string, detail?: string): Promise<Report> {
  console.info('[EnBloom] report user started', { targetUserIdExists: Boolean(targetUserId) });
  const reporterId = await getCurrentUserId();
  const trimmedReason = reason.trim();
  const trimmedDetail = detail?.trim() || null;

  if (reporterId === targetUserId) {
    console.info('[EnBloom] report user success', { success: false });
    throw new Error('自分自身は通報できません。');
  }

  if (!trimmedReason) {
    console.info('[EnBloom] report user success', { success: false });
    throw new Error('通報理由を選択してください。');
  }

  const { data, error } = await requireSupabaseClient()
    .from('reports')
    .insert({
      reporter_id: reporterId,
      reported_user_id: targetUserId,
      reason: trimmedReason,
      detail: trimmedDetail,
      status: 'open' satisfies ReportStatus,
    })
    .select(reportColumns)
    .single<ReportRow>();

  const success = !error;
  console.info('[EnBloom] report user success', { success });
  if (error) throw error;

  return data;
}

export async function getMyReports(userId?: string): Promise<Report[]> {
  if (!isSupabaseConfigured || !supabase) {
    const localIds = readLocalReportedUserIds();
    console.info('[EnBloom] reports count', { count: localIds.length });
    return localIds.map((reportedUserId, index) => ({
      id: `local-report-${reportedUserId}-${index}`,
      reporter_id: 'current-user',
      reported_user_id: reportedUserId,
      reason: 'ローカルデモ通報',
      detail: null,
      status: 'open',
      reviewed_by: null,
      reviewed_at: null,
      admin_note: null,
      created_at: new Date(0).toISOString(),
    }));
  }

  const reporterId = userId ?? await getCurrentUserId();
  const { data, error } = await requireSupabaseClient()
    .from('reports')
    .select(reportColumns)
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  console.info('[EnBloom] reports count', { count: data?.length ?? 0 });
  return (data ?? []) as Report[];
}

export async function getAdminReports(): Promise<ReportWithProfiles[]> {
  const { data, error } = await requireSupabaseClient()
    .from('reports')
    .select(reportWithProfilesColumns)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  console.info('[EnBloom] reports count', { count: data?.length ?? 0 });
  return (data ?? []).map((row) => mapReportWithProfiles(row as unknown as ReportRowWithProfiles));
}
