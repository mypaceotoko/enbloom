import { attachPrimaryPhotoUrls, getPrimaryProfilePhotos } from './profilePhotoApi';
import type { ProfileRow } from './profileApi';
import { profileRowToUserProfile } from './profileApi';
import { isSupabaseConfigured, requireSupabaseClient, supabase } from './supabase';
import { isMissingColumnError, isMissingFunctionError, isPermissionDeniedError } from './dbError';
import { getSafeErrorLog } from './errorMessage';
import type { Report, ReportStatus, ReportWithProfiles } from '../types/report';

const localAppStateKey = 'connectbloom.appState.v1';
const legacyStoragePrefix = 'en' + 'bloom';
const legacyLocalAppStateKey = `${legacyStoragePrefix}.appState.v1`;
const legacyReportColumns = 'id,reporter_id,reported_user_id,reason,detail,status,reviewed_by,reviewed_at,admin_note,archived_at,archived_by,created_at';
const reportColumns = `${legacyReportColumns},target_activity_post_id,target_chat_room_id,target_chat_room_message_id`;
const legacyProfileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const profileColumns = `${legacyProfileColumns},account_status`;
const legacyReportWithProfilesColumns = [
  legacyReportColumns,
  `reporter_profile:profiles!reports_reporter_id_fkey(${legacyProfileColumns})`,
  `reported_profile:profiles!reports_reported_user_id_fkey(${legacyProfileColumns})`,
].join(',');
const reportWithProfilesColumns = [
  reportColumns,
  `reporter_profile:profiles!reports_reporter_id_fkey(${profileColumns})`,
  `reported_profile:profiles!reports_reported_user_id_fkey(${profileColumns})`,
  'target_chat_room:chat_rooms!reports_target_chat_room_id_fkey(slug)',
].join(',');

const reportStatuses = ['open', 'reviewing', 'resolved', 'dismissed'] as const satisfies readonly ReportStatus[];

type ReportRow = Report;
type LegacyReportRow = Omit<Report, 'target_activity_post_id' | 'target_chat_room_id' | 'target_chat_room_message_id'>;
type ReportRowWithProfiles = (ReportRow | LegacyReportRow) & {
  reporter_profile?: ProfileRow | ProfileRow[] | null;
  reported_profile?: ProfileRow | ProfileRow[] | null;
  target_chat_room?: { slug: string } | { slug: string }[] | null;
};

type UpdateReportReviewParams = {
  status?: ReportStatus;
  adminNote?: string;
};

type UpdateReportReviewResult = {
  success: boolean;
  report_id: string;
  status: ReportStatus;
  reviewed_at: string;
};

type ReportReviewUpdateRow = {
  id: string;
  status: ReportStatus;
  reviewed_at: string | null;
};

type ArchiveReportResult = {
  success: boolean;
  report_id: string;
  archived_at: string | null;
};

type GetAdminReportsOptions = {
  includeArchived?: boolean;
};

function readLocalReportedUserIds() {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(localAppStateKey) ?? window.localStorage.getItem(legacyLocalAppStateKey);
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

function withLegacyReportTargets(row: LegacyReportRow | ReportRow): ReportRow {
  return {
    ...row,
    target_activity_post_id: 'target_activity_post_id' in row ? row.target_activity_post_id : null,
    target_chat_room_id: 'target_chat_room_id' in row ? row.target_chat_room_id : null,
    target_chat_room_message_id: 'target_chat_room_message_id' in row ? row.target_chat_room_message_id : null,
  };
}

function mapReportWithProfiles(row: ReportRowWithProfiles): ReportWithProfiles {
  const reporter = firstProfile(row.reporter_profile);
  const reportedUser = firstProfile(row.reported_profile);

  const targetRoom = Array.isArray(row.target_chat_room) ? row.target_chat_room[0] : row.target_chat_room;

  return {
    ...withLegacyReportTargets(row),
    reporter: reporter ? profileRowToUserProfile(reporter) : null,
    reportedUser: reportedUser ? profileRowToUserProfile(reportedUser) : null,
    reportedUserAccountStatus: reportedUser?.account_status ?? 'active',
    targetChatRoomSlug: targetRoom?.slug ?? null,
  };
}

function assertReportStatus(status: ReportStatus) {
  if (!reportStatuses.includes(status)) {
    throw new Error('通報ステータスが不正です。');
  }
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function reportUser(targetUserId: string, reason: string, detail?: string): Promise<Report> {
  console.info('[ConnectBloom] report user started', { targetUserIdExists: Boolean(targetUserId) });
  const reporterId = await getCurrentUserId();
  const trimmedReason = reason.trim();
  const trimmedDetail = detail?.trim() || null;

  if (reporterId === targetUserId) {
    console.info('[ConnectBloom] report user success', { success: false });
    throw new Error('自分自身は通報できません。');
  }

  if (!trimmedReason) {
    console.info('[ConnectBloom] report user success', { success: false });
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
    .select(legacyReportColumns)
    .single<LegacyReportRow>();

  const success = !error;
  console.info('[ConnectBloom] report user success', { success });
  if (error) throw error;

  return withLegacyReportTargets(data);
}

export async function getMyReports(userId?: string): Promise<Report[]> {
  if (!isSupabaseConfigured || !supabase) {
    const localIds = readLocalReportedUserIds();
    console.info('[ConnectBloom] reports count', { count: localIds.length });
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
      archived_at: null,
      archived_by: null,
      target_activity_post_id: null,
      target_chat_room_id: null,
      target_chat_room_message_id: null,
      targetChatRoomSlug: null,
      reportedUserAccountStatus: 'active',
      created_at: new Date(0).toISOString(),
    }));
  }

  const reporterId = userId ?? await getCurrentUserId();
  const queryReports = (columns: string) => requireSupabaseClient()
    .from('reports')
    .select(columns)
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false });

  let { data, error } = await queryReports(reportColumns);

  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] reports fetch fallback used', getSafeErrorLog(error, 'reports_missing_column_fallback'));
    ({ data, error } = await queryReports(legacyReportColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] reports fetch failed', getSafeErrorLog(error, 'reports_fetch_failed'));
    throw error;
  }
  console.info('[ConnectBloom] reports count', { count: data?.length ?? 0 });
  return ((data ?? []) as unknown as Array<LegacyReportRow | ReportRow>).map(withLegacyReportTargets);
}

export async function getAdminReports(options: GetAdminReportsOptions = {}): Promise<ReportWithProfiles[]> {
  const queryReports = (columns: string) => {
    let query = requireSupabaseClient()
      .from('reports')
      .select(columns);

    if (!options.includeArchived) {
      query = query.is('archived_at', null);
    }

    return query
      .order('created_at', { ascending: false })
      .limit(100);
  };

  let { data, error } = await queryReports(reportWithProfilesColumns);

  if (error && isMissingColumnError(error)) {
    console.warn('[ConnectBloom] admin reports fetch fallback used', getSafeErrorLog(error, 'admin_reports_missing_column_fallback'));
    ({ data, error } = await queryReports(legacyReportWithProfilesColumns));
  }

  if (error) {
    console.warn('[ConnectBloom] admin reports fetch failed', getSafeErrorLog(error, 'admin_reports_fetch_failed'));
    throw error;
  }
  console.info('[ConnectBloom] reports count', { count: data?.length ?? 0 });
  const reports = (data ?? []).map((row) => mapReportWithProfiles(row as unknown as ReportRowWithProfiles));
  const profiles = reports.flatMap((report) => [report.reporter, report.reportedUser]).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const photosByUserId = await getPrimaryProfilePhotos(profiles.map((profile) => profile.id));
  const profilesWithPhotos = attachPrimaryPhotoUrls(profiles, photosByUserId);
  const profileById = new Map(profilesWithPhotos.map((profile) => [profile.id, profile]));
  return reports.map((report) => ({
    ...report,
    reporter: report.reporter ? profileById.get(report.reporter.id) ?? report.reporter : null,
    reportedUser: report.reportedUser ? profileById.get(report.reportedUser.id) ?? report.reportedUser : null,
  }));
}

export async function updateReportReview(reportId: string, review: UpdateReportReviewParams): Promise<UpdateReportReviewResult> {
  console.info('[ConnectBloom] report update started');
  console.info('[ConnectBloom] reportId exists', Boolean(reportId));

  if (!reportId) {
    console.info('[ConnectBloom] report status update success', false);
    console.info('[ConnectBloom] report admin note update success', false);
    throw new Error('通報IDを確認できませんでした。');
  }

  await getCurrentUserId();

  if (review.status) assertReportStatus(review.status);

  const updatesStatus = typeof review.status !== 'undefined';
  const updatesAdminNote = typeof review.adminNote !== 'undefined';
  const { data, error } = await requireSupabaseClient()
    .rpc('update_report_review', {
      p_report_id: reportId,
      p_status: review.status ?? null,
      p_admin_note: updatesAdminNote ? review.adminNote ?? '' : null,
    })
    .single<UpdateReportReviewResult>();

  const success = !error && Boolean(data?.success);
  if (updatesStatus) console.info('[ConnectBloom] report status update success', success);
  if (updatesAdminNote) console.info('[ConnectBloom] report admin note update success', success);
  if (error) {
    console.error('[reportApi] failed to update report review', getSafeErrorLog(error, 'report_review_rpc_failed'));
    throw error;
  }
  if (!data?.success) throw new Error('通報レビューの更新に失敗しました。');

  return data;
}

async function updateReportStatusDirect(reportId: string, status: ReportStatus): Promise<UpdateReportReviewResult> {
  const reviewedBy = await getCurrentUserId();
  const reviewedAt = new Date().toISOString();
  const { data, error } = await requireSupabaseClient()
    .from('reports')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    })
    .eq('id', reportId)
    .select('id,status,reviewed_at')
    .single<ReportReviewUpdateRow>();

  if (error) {
    console.error('[reportApi] failed to update report status', getSafeErrorLog(error, 'report_status_direct_update_failed'));
    throw error;
  }

  if (!data) throw new Error('通報レビューの更新に失敗しました。');

  return {
    success: true,
    report_id: data.id,
    status: data.status,
    reviewed_at: data.reviewed_at ?? reviewedAt,
  };
}

export async function updateReportStatus(reportId: string, status: ReportStatus): Promise<UpdateReportReviewResult> {
  console.info('[ConnectBloom] report status update started');
  console.info('[ConnectBloom] reportId exists', Boolean(reportId));

  if (!reportId) {
    console.info('[ConnectBloom] report status update success', false);
    throw new Error('通報IDを確認できませんでした。');
  }

  assertReportStatus(status);

  try {
    const result = await updateReportStatusDirect(reportId, status);
    console.info('[ConnectBloom] report status update success', true);
    return result;
  } catch (directUpdateError) {
    const shouldNoteExpectedFallback = isMissingColumnError(directUpdateError)
      || isMissingFunctionError(directUpdateError)
      || isPermissionDeniedError(directUpdateError);
    const directErrorLog = getSafeErrorLog(directUpdateError, 'report_status_direct_update_failed');
    console.warn(
      shouldNoteExpectedFallback
        ? '[reportApi] report status direct update fallback used'
        : '[reportApi] report status direct update failed; trying RPC fallback',
      directErrorLog,
    );

    try {
      const { data, error: rpcError } = await requireSupabaseClient()
        .rpc('update_report_review', {
          p_report_id: reportId,
          p_status: status,
          p_admin_note: null,
        })
        .single<UpdateReportReviewResult>();

      const success = !rpcError && Boolean(data?.success);
      if (rpcError) {
        console.error('[reportApi] report status RPC fallback failed', {
          directError: directErrorLog,
          rpcError: getSafeErrorLog(rpcError, 'report_status_rpc_fallback_failed'),
        });
        throw rpcError;
      }
      if (!data?.success) {
        const rpcResultError = new Error('通報レビューの更新に失敗しました。');
        console.error('[reportApi] report status RPC fallback returned unsuccessful result', {
          directError: directErrorLog,
          rpcError: getSafeErrorLog(rpcResultError, 'report_status_rpc_fallback_unsuccessful'),
          rpcSuccess: success,
        });
        throw rpcResultError;
      }

      console.info('[ConnectBloom] report status update success', true);
      return data;
    } catch (rpcFallbackError) {
      console.error('[reportApi] failed to update report status after RPC fallback', {
        directError: directErrorLog,
        rpcError: getSafeErrorLog(rpcFallbackError, 'report_status_rpc_fallback_failed'),
      });
      console.info('[ConnectBloom] report status update success', false);
      throw rpcFallbackError;
    }
  }
}

export async function updateReportAdminNote(reportId: string, adminNote: string): Promise<UpdateReportReviewResult> {
  return updateReportReview(reportId, { adminNote });
}


async function updateReportArchive(reportId: string, archived: boolean): Promise<ArchiveReportResult> {
  console.info('[ConnectBloom] report archive started');
  console.info('[ConnectBloom] reportId exists', Boolean(reportId));

  if (!reportId) {
    console.info('[ConnectBloom] report archive success', false);
    throw new Error('通報IDを確認できませんでした。');
  }

  await getCurrentUserId();

  const { data, error } = await requireSupabaseClient()
    .rpc(archived ? 'archive_report' : 'unarchive_report', { p_report_id: reportId })
    .single<ArchiveReportResult>();

  const success = !error && Boolean(data?.success);
  console.info('[ConnectBloom] report archive success', success);
  if (error) throw error;
  if (!data?.success) throw new Error('通報の整理に失敗しました。');

  return data;
}

export async function archiveReport(reportId: string): Promise<ArchiveReportResult> {
  return updateReportArchive(reportId, true);
}

export async function unarchiveReport(reportId: string): Promise<ArchiveReportResult> {
  return updateReportArchive(reportId, false);
}
