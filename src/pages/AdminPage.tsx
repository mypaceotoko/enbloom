import { Archive, ArchiveRestore, ChevronDown, ClipboardList, Copy, KeyRound, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAdmin } from '../hooks/useAdmin';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { createInviteCode, deactivateInviteCode, deleteInviteCode, getManagedInviteCodes, getMyInviteCodes, type InviteCodeRow } from '../lib/inviteCodeApi';
import { restoreProfile, suspendProfile } from '../lib/adminModerationApi';
import { deleteActivityPostForAdmin, getArchivedActivityPostsForAdmin, restoreActivityPostForAdmin } from '../lib/activityBoardApi';
import { archiveReport, getAdminReports, unarchiveReport, updateReportAdminNote, updateReportStatus } from '../lib/reportApi';
import { GENERAL_USER_INVITE_CODE_LIMIT } from '../lib/admin';
import { getSafeErrorLog, getShortErrorMessage } from '../lib/errorMessage';
import { requireSupabaseClient } from '../lib/supabase';
import type { ActivityPostWithStats } from '../types/activityBoard';
import type { ReportStatus, ReportWithProfiles } from '../types/report';

type InviteCodeForm = {
  code: string;
  maxUses: string;
  unlimited: boolean;
  expiresAt: string;
  isActive: boolean;
};

const defaultInviteCodeForm: InviteCodeForm = {
  code: 'MYPACE-2026',
  maxUses: '',
  unlimited: true,
  expiresAt: '',
  isActive: true,
};

const inviteCodePrefixes = ['GOEN', 'BLOOM', 'CONNECTBLOOM', 'MYPACE', 'SAKURA'];
const reportStatusOptions: Array<{ value: ReportStatus; label: string }> = [
  { value: 'open', label: '未対応' },
  { value: 'reviewing', label: '確認中' },
  { value: 'resolved', label: '対応済み' },
  { value: 'dismissed', label: '対応不要' },
];
const inviteCodeCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const connectBloomShareUrl = (import.meta.env.VITE_CONNECTBLOOM_URL ?? 'https://connect-bloom.vercel.app/').replace(/\/?$/, '/');

function randomInt(max: number) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function generateInviteCodeCandidate() {
  const prefix = inviteCodePrefixes[randomInt(inviteCodePrefixes.length)];
  const suffixLength = 4 + randomInt(3);
  const suffix = Array.from({ length: suffixLength }, () => inviteCodeCharacters[randomInt(inviteCodeCharacters.length)]).join('');

  return `${prefix}-${suffix}`;
}

function formatDateTime(value: string | null, emptyLabel = '期限なし', locale = 'ja-JP') {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminPage({ inviteOnly = false }: { inviteOnly?: boolean } = {}) {
  const { reportedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { isFounder } = useAdmin();
  const { language, t } = useLanguage();
  const [inviteCodes, setInviteCodes] = useState<InviteCodeRow[]>([]);
  const [supabaseReports, setSupabaseReports] = useState<ReportWithProfiles[]>([]);
  const [archivedActivityPosts, setArchivedActivityPosts] = useState<ActivityPostWithStats[]>([]);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [reportNoteDrafts, setReportNoteDrafts] = useState<Record<string, string>>({});
  const [updatingReportStatusId, setUpdatingReportStatusId] = useState<string | null>(null);
  const [savingReportNoteId, setSavingReportNoteId] = useState<string | null>(null);
  const [archivingReportId, setArchivingReportId] = useState<string | null>(null);
  const [updatingAccountStatusUserId, setUpdatingAccountStatusUserId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [includeArchivedReports, setIncludeArchivedReports] = useState(false);
  const [activityPostError, setActivityPostError] = useState('');
  const [activityPostNotice, setActivityPostNotice] = useState('');
  const [loadingActivityPosts, setLoadingActivityPosts] = useState(false);
  const [managingActivityPostId, setManagingActivityPostId] = useState<string | null>(null);
  const [form, setForm] = useState<InviteCodeForm>(() => (inviteOnly ? { ...defaultInviteCodeForm, code: generateInviteCodeCandidate(), maxUses: '1', unlimited: false } : defaultInviteCodeForm));
  const [inviteLoading, setInviteLoading] = useState(false);
  const [managingInviteCodeId, setManagingInviteCodeId] = useState<string | null>(null);
  const [copiedInviteCodeId, setCopiedInviteCodeId] = useState<string | null>(null);
  const [copiedInviteMessageId, setCopiedInviteMessageId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const reportedUsers = mockUsers.filter((mockUser) => reportedUserIds.includes(mockUser.id));
  const reportStats = useMemo(() => ({
    total: supabaseReports.length,
    open: supabaseReports.filter((report) => report.status === 'open').length,
    reviewing: supabaseReports.filter((report) => report.status === 'reviewing').length,
    resolved: supabaseReports.filter((report) => report.status === 'resolved').length,
    dismissed: supabaseReports.filter((report) => report.status === 'dismissed').length,
  }), [supabaseReports]);
  const reportCount = isSupabaseMode && isAuthenticated ? reportStats.total : reportedUserIds.length;
  const displayedReportStats = isSupabaseMode && isAuthenticated
    ? reportStats
    : { total: reportedUserIds.length, open: reportedUserIds.length, reviewing: 0, resolved: 0, dismissed: 0 };
  const ownInviteCodeCount = useMemo(() => inviteCodes.filter((inviteCode) => inviteCode.created_by === user?.id).length, [inviteCodes, user?.id]);
  const remainingInviteSlots = Math.max(GENERAL_USER_INVITE_CODE_LIMIT - ownInviteCodeCount, 0);
  const inviteLimitReached = !isFounder && ownInviteCodeCount >= GENERAL_USER_INVITE_CODE_LIMIT;
  const locale = language === 'en' ? 'en-US' : 'ja-JP';
  const inviteSlotSummary = isFounder
    ? t('inviteCodes.slots.unlimited')
    : `${t('inviteCodes.remainingInvites')} ${remainingInviteSlots} / ${GENERAL_USER_INVITE_CODE_LIMIT} ${t('inviteCodes.peopleUnit')}`;
  const inviteCountLabel = useMemo(() => {
    if (!isSupabaseMode) return 'デモ表示';
    if (!isAuthenticated) return '未ログイン';
    return isFounder ? `${inviteCodes.length}件` : `${ownInviteCodeCount}/${GENERAL_USER_INVITE_CODE_LIMIT}件`;
  }, [inviteCodes.length, isAuthenticated, isFounder, isSupabaseMode, ownInviteCodeCount]);
  const adminCards = [
    { icon: KeyRound, title: '招待コード管理', count: inviteCountLabel, body: 'βテスターに共有する招待コードを作成・確認できます。\n招待コードは、紹介経路を記録するために使います。' },
    { icon: ClipboardList, title: '募集管理', count: `${archivedActivityPosts.length}件`, body: '非表示にした募集を確認し、必要に応じて再表示または完全削除できます。' },
    { icon: ShieldAlert, title: '通報管理', count: `${reportCount}件`, body: '届いた通報を確認し、必要に応じて対応できます。' },
  ];

  useEffect(() => {
    if (!isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;
    const supabaseClient = requireSupabaseClient();

    Promise.all([
      supabaseClient.auth.getUser(),
      supabaseClient.rpc('is_admin'),
    ])
      .then(([currentUserResult, isAdminResult]) => {
        if (ignore) return;

        const currentUserError = currentUserResult.error;
        const isAdminError = isAdminResult.error;
        console.info('[AdminPage] admin screen current user diagnostic', {
          email: currentUserResult.data.user?.email ?? user.email ?? null,
          currentUserId: currentUserResult.data.user?.id ?? user.id,
          currentUserIdExists: Boolean(currentUserResult.data.user?.id ?? user.id),
          isFounder,
          isAdmin: Boolean(isAdminResult.data),
          currentUserError: currentUserError ? getSafeErrorLog(currentUserError, 'admin_screen_get_current_user_failed') : undefined,
          isAdminError: isAdminError ? getSafeErrorLog(isAdminError, 'admin_screen_is_admin_check_failed') : undefined,
        });
      })
      .catch((caughtError: unknown) => {
        if (ignore) return;
        console.info('[AdminPage] admin screen current user diagnostic', {
          email: user.email ?? null,
          currentUserId: user.id,
          currentUserIdExists: Boolean(user.id),
          isFounder,
          isAdmin: false,
          diagnosticError: getSafeErrorLog(caughtError, 'admin_screen_diagnostic_failed'),
        });
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isFounder, isSupabaseMode, user]);

  useEffect(() => {
    if (!isFounder || !isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;
    getAdminReports({ includeArchived: includeArchivedReports })
      .then((reports) => {
        if (!ignore) {
          setSupabaseReports(reports);
          setReportNoteDrafts(Object.fromEntries(reports.map((report) => [report.id, report.admin_note ?? ''])));
        }
      })
      .catch((caughtError: unknown) => {
        console.warn('[ConnectBloom] admin reports load failed', getSafeErrorLog(caughtError, 'admin_reports_load_failed'));
        if (!ignore) setReportError(getShortErrorMessage(caughtError, '通報一覧の取得に失敗しました。'));
      });

    return () => {
      ignore = true;
    };
  }, [includeArchivedReports, isAuthenticated, isFounder, isSupabaseMode, user]);

  useEffect(() => {
    if (!isFounder || !isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (!ignore) {
          setLoadingActivityPosts(true);
          setActivityPostError('');
        }
        return getArchivedActivityPostsForAdmin();
      })
      .then((posts) => {
        if (!ignore) setArchivedActivityPosts(posts);
      })
      .catch((caughtError: unknown) => {
        console.warn('[ConnectBloom] admin archived activity posts load failed', getSafeErrorLog(caughtError, 'admin_archived_activity_posts_load_failed'));
        if (!ignore) setActivityPostError(getShortErrorMessage(caughtError, '非表示募集の取得に失敗しました。'));
      })
      .finally(() => {
        if (!ignore) setLoadingActivityPosts(false);
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isFounder, isSupabaseMode, user]);

  useEffect(() => {
    if (!isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;
    (isFounder ? getManagedInviteCodes() : getMyInviteCodes(user.id))
      .then((nextInviteCodes) => {
        if (!ignore) setInviteCodes(nextInviteCodes);
      })
      .catch((caughtError: unknown) => {
        if (!ignore) setInviteError(caughtError instanceof Error ? caughtError.message : '招待コード一覧の取得に失敗しました。');
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isFounder, isSupabaseMode, user]);

  function updateForm(field: keyof InviteCodeForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildInviteMessage(inviteCode: InviteCodeRow) {
    return [
      'ConnectBloomのβテスト招待コードです。',
      '',
      `招待コード: ${inviteCode.code}`,
      '',
      'ConnectBloomは、紹介から始まる招待制コネクトSNSです。',
      '共通の興味や、一緒にやりたいことから、ゆっくり人とつながれます。',
      '',
      '以下のページから参加できます。',
      connectBloomShareUrl,
      '',
      '気づいた点があれば、スクリーンショットと一緒に教えてもらえると助かります。',
    ].join('\n');
  }

  async function handleCopyInviteCode(inviteCode: InviteCodeRow) {
    setInviteError('');

    try {
      await navigator.clipboard.writeText(inviteCode.code);
      setCopiedInviteCodeId(inviteCode.id);
      window.setTimeout(() => setCopiedInviteCodeId((current) => (current === inviteCode.id ? null : current)), 1800);
    } catch {
      setInviteError('コピーできませんでした。招待コードを選択してコピーしてください。');
    }
  }

  async function handleCopyInviteMessage(inviteCode: InviteCodeRow) {
    setInviteError('');

    try {
      await navigator.clipboard.writeText(buildInviteMessage(inviteCode));
      setCopiedInviteMessageId(inviteCode.id);
      window.setTimeout(() => setCopiedInviteMessageId((current) => (current === inviteCode.id ? null : current)), 1800);
    } catch {
      setInviteError('コピーできませんでした。招待文を選択してコピーしてください。');
    }
  }

  function handleGenerateInviteCodeCandidate() {
    const nextCode = generateInviteCodeCandidate();
    setInviteError('');
    setInviteNotice(`${nextCode} を候補として作成しました。保存するまでは登録されません。紹介経路が分かるよう、手入力で調整してもOKです。`);
    setForm((current) => ({ ...current, code: nextCode }));
  }

  async function handleCreateInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError('');
    setInviteNotice('');

    if (!isSupabaseMode) {
      setInviteNotice('デモ表示では保存せず、画面確認だけできます。');
      return;
    }

    if (!isAuthenticated || !user) {
      setInviteError('招待コードを作成するにはログインしてください。');
      return;
    }

    if (inviteLimitReached) {
      setInviteError('招待枠を使い切りました。追加の招待が必要な場合は、管理者に相談してください。');
      return;
    }

    const generalInvitePage = inviteOnly && !isFounder;
    const parsedMaxUses = Number(form.maxUses);
    if (!generalInvitePage && !form.unlimited && (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0)) {
      setInviteError('利用上限は1以上の整数で入力してください。');
      return;
    }
    const maxUses = generalInvitePage ? 1 : (form.unlimited ? null : parsedMaxUses);

    setInviteLoading(true);
    try {
      const createdInviteCode = await createInviteCode({
        code: form.code,
        createdBy: user.id,
        maxUses,
        isActive: form.isActive,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      });
      setInviteCodes((current) => [createdInviteCode, ...current.filter((inviteCode) => inviteCode.id !== createdInviteCode.id)]);
      setInviteNotice(t('inviteCodes.created'));
      setForm(inviteOnly ? { ...defaultInviteCodeForm, code: generateInviteCodeCandidate(), maxUses: '1', unlimited: false } : defaultInviteCodeForm);
    } catch (caughtError) {
      setInviteError(caughtError instanceof Error ? caughtError.message : '招待コードの作成に失敗しました。');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleDeleteInviteCode(inviteCode: InviteCodeRow) {
    setInviteError('');
    setInviteNotice('');

    if (!isSupabaseMode) {
      setInviteNotice('デモ表示では保存されていないため、削除操作は画面確認のみです。');
      return;
    }

    if (!isAuthenticated || !user) {
      setInviteError('招待コードを削除するにはログインしてください。');
      return;
    }

    if (inviteCode.used_count > 0) {
      setInviteError('すでに使われた招待コードは削除できません。無効化してください。');
      return;
    }

    const confirmed = window.confirm('この招待コードを削除しますか？まだ誰にも使われていないため、完全に削除されます。');
    if (!confirmed) return;

    setManagingInviteCodeId(inviteCode.id);
    try {
      await deleteInviteCode(inviteCode.id);
      setInviteCodes((current) => current.filter((currentInviteCode) => currentInviteCode.id !== inviteCode.id));
      setInviteNotice('招待コードを削除しました。');
    } catch (caughtError) {
      setInviteError(caughtError instanceof Error ? caughtError.message : '招待コードの削除に失敗しました。');
    } finally {
      setManagingInviteCodeId(null);
    }
  }

  function getReportStatusLabel(status: ReportStatus) {
    return reportStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  function getReportStatusBadgeClass(status: ReportStatus) {
    const classes: Record<ReportStatus, string> = {
      open: 'bg-theme-accent-soft text-theme-main-dark ring-1 ring-theme-accent/25',
      reviewing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80',
      resolved: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80',
      dismissed: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    };

    return classes[status];
  }

  function canArchiveReport(report: ReportWithProfiles) {
    return report.status === 'resolved' || report.status === 'dismissed';
  }

  function toggleReport(reportId: string) {
    setExpandedReportId((current) => (current === reportId ? null : reportId));
  }

  function updateReportNoteDraft(reportId: string, value: string) {
    setReportNoteDrafts((current) => ({ ...current, [reportId]: value }));
  }

  async function handleUpdateReportStatus(report: ReportWithProfiles, nextStatus: ReportStatus) {
    if (nextStatus === report.status) return;
    setReportError('');
    setReportNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setReportError('ログイン後に対応状況を更新できます。');
      return;
    }

    setUpdatingReportStatusId(report.id);
    try {
      const updatedReview = await updateReportStatus(report.id, nextStatus);
      setSupabaseReports((current) => current.map((currentReport) => (
        currentReport.id === report.id
          ? { ...currentReport, status: updatedReview.status, reviewed_at: updatedReview.reviewed_at }
          : currentReport
      )));
      setReportNotice('ステータスを更新しました');
    } catch (caughtError) {
      console.error('[AdminPage] failed to update report status', getSafeErrorLog(caughtError, 'report_status_update_failed'));
      setReportError('ステータス更新に失敗しました');
    } finally {
      setUpdatingReportStatusId(null);
    }
  }

  async function handleSaveReportAdminNote(report: ReportWithProfiles) {
    setReportError('');
    setReportNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setReportError('ログイン後に管理メモを保存できます。');
      return;
    }

    const nextAdminNote = reportNoteDrafts[report.id] ?? '';
    setSavingReportNoteId(report.id);
    try {
      const updatedReview = await updateReportAdminNote(report.id, nextAdminNote);
      setSupabaseReports((current) => current.map((currentReport) => (
        currentReport.id === report.id
          ? { ...currentReport, admin_note: nextAdminNote, status: updatedReview.status, reviewed_at: updatedReview.reviewed_at }
          : currentReport
      )));
      setReportNotice('管理メモを保存しました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] report admin note save failed', getSafeErrorLog(caughtError, 'report_admin_note_save_failed'));
      setReportError('管理メモの保存に失敗しました');
    } finally {
      setSavingReportNoteId(null);
    }
  }



  async function handleToggleReportedUserStatus(report: ReportWithProfiles) {
    setReportError('');
    setReportNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setReportError('ログイン後にユーザー利用制限を更新できます。');
      return;
    }

    if (report.reported_user_id === user?.id) {
      setReportError('Founder は利用停止できません。');
      return;
    }

    const isSuspended = report.reportedUserAccountStatus === 'suspended';
    const confirmed = window.confirm(isSuspended
      ? 'このユーザーの利用停止を解除しますか？'
      : 'このユーザーを利用停止にしますか？ログイン自体は残り、主要機能の利用を制限します。');
    if (!confirmed) return;

    setUpdatingAccountStatusUserId(report.reported_user_id);
    try {
      const result = isSuspended ? await restoreProfile(report.reported_user_id) : await suspendProfile(report.reported_user_id);
      setSupabaseReports((current) => current.map((currentReport) => (
        currentReport.reported_user_id === report.reported_user_id
          ? { ...currentReport, reportedUserAccountStatus: result.account_status }
          : currentReport
      )));
      setReportNotice(isSuspended ? '利用停止を解除しました。' : 'ユーザーを利用停止にしました。');
    } catch (caughtError) {
      console.warn('[ConnectBloom] reported user status update failed', getSafeErrorLog(caughtError, 'reported_user_status_update_failed'));
      setReportError('ユーザー利用制限の更新に失敗しました。');
    } finally {
      setUpdatingAccountStatusUserId(null);
    }
  }

  async function handleToggleReportArchive(report: ReportWithProfiles) {
    setReportError('');
    setReportNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setReportError('ログイン後に通報を整理できます。');
      return;
    }

    if (!canArchiveReport(report)) {
      setReportError('未対応または確認中の通報は整理できません。先に対応済みまたは対応不要にしてください。');
      return;
    }

    const isArchived = Boolean(report.archived_at);
    const confirmed = window.confirm(isArchived
      ? 'この通報のアーカイブを解除しますか？通常の通報一覧に戻ります。'
      : 'この通報をアーカイブしますか？対応済みの通報として通常の一覧から非表示になります。');
    if (!confirmed) return;

    setArchivingReportId(report.id);
    try {
      const result = isArchived ? await unarchiveReport(report.id) : await archiveReport(report.id);
      setSupabaseReports((current) => {
        const nextReports = current.map((currentReport) => (
          currentReport.id === report.id
            ? { ...currentReport, archived_at: result.archived_at, archived_by: isArchived ? null : user?.id ?? currentReport.archived_by }
            : currentReport
        ));

        return includeArchivedReports ? nextReports : nextReports.filter((currentReport) => currentReport.id !== report.id);
      });
      if (!includeArchivedReports && !isArchived) setExpandedReportId((current) => (current === report.id ? null : current));
      setReportNotice(isArchived ? '通報のアーカイブを解除しました' : '通報をアーカイブしました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] report archive update failed', getSafeErrorLog(caughtError, 'report_archive_update_failed'));
      setReportError('通報の整理に失敗しました');
    } finally {
      setArchivingReportId(null);
    }
  }

  async function handleRestoreActivityPost(post: ActivityPostWithStats) {
    setActivityPostError('');
    setActivityPostNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setActivityPostError('ログイン後に募集を管理できます。');
      return;
    }

    setManagingActivityPostId(post.id);
    try {
      await restoreActivityPostForAdmin(post.id);
      setArchivedActivityPosts((current) => current.filter((currentPost) => currentPost.id !== post.id));
      setActivityPostNotice('募集を再表示しました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] admin activity post restore failed', getSafeErrorLog(caughtError, 'admin_activity_post_restore_failed'));
      setActivityPostError('募集の更新に失敗しました');
    } finally {
      setManagingActivityPostId(null);
    }
  }

  async function handleDeleteActivityPost(post: ActivityPostWithStats) {
    setActivityPostError('');
    setActivityPostNotice('');

    if (!isSupabaseMode || !isAuthenticated) {
      setActivityPostError('ログイン後に募集を管理できます。');
      return;
    }

    const confirmed = window.confirm('この募集を完全に削除します。元に戻せません。よろしいですか？');
    if (!confirmed) return;

    setManagingActivityPostId(post.id);
    try {
      await deleteActivityPostForAdmin(post.id);
      setArchivedActivityPosts((current) => current.filter((currentPost) => currentPost.id !== post.id));
      setActivityPostNotice('募集を完全削除しました');
    } catch (caughtError) {
      console.warn('[ConnectBloom] admin activity post delete failed', getSafeErrorLog(caughtError, 'admin_activity_post_delete_failed'));
      setActivityPostError('募集の削除に失敗しました');
    } finally {
      setManagingActivityPostId(null);
    }
  }

  async function handleDeactivateInviteCode(inviteCode: InviteCodeRow) {
    setInviteError('');
    setInviteNotice('');

    if (!isSupabaseMode) {
      setInviteNotice('デモ表示では保存されていないため、無効化操作は画面確認のみです。');
      return;
    }

    if (!isAuthenticated || !user) {
      setInviteError('招待コードを無効化するにはログインしてください。');
      return;
    }

    if (!inviteCode.is_active) {
      setInviteNotice('この招待コードはすでに無効化済みです。');
      return;
    }

    const confirmed = window.confirm('この招待コードを無効化しますか？すでに使われているため、履歴を残したまま新規利用だけ停止します。');
    if (!confirmed) return;

    setManagingInviteCodeId(inviteCode.id);
    try {
      const deactivatedInviteCode = await deactivateInviteCode(inviteCode.id);
      setInviteCodes((current) => current.map((currentInviteCode) => (currentInviteCode.id === deactivatedInviteCode.id ? deactivatedInviteCode : currentInviteCode)));
      setInviteNotice('招待コードを無効化しました。');
    } catch (caughtError) {
      setInviteError(caughtError instanceof Error ? caughtError.message : '招待コードの無効化に失敗しました。');
    } finally {
      setManagingInviteCodeId(null);
    }
  }

  if (!isFounder && !inviteOnly) {
    return (
      <PageShell description="このページは管理者のみ利用できます。" eyebrow="Admin" title="管理者専用ページです">
        <Card className="space-y-3 p-4 text-center shadow-sm">
          <p className="text-sm font-bold leading-6 text-theme-muted">このページは管理者のみ利用できます。</p>
          <Button className="mx-auto" onClick={() => { window.location.href = '/settings'; }} type="button" variant="secondary">設定へ戻る</Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell description={inviteOnly ? <>{t('inviteCodes.pageDescription1')}<br />{t('inviteCodes.pageDescription2')}</> : <>βテスター用の招待コード作成と、届いた通報の確認を行えます。<br />将来的に不適切な募集・ルーム発言・通報ユーザー・アカウント停止などを管理できるよう拡張する前提です。</>} eyebrow={inviteOnly ? 'Invite slots' : 'Admin'} title={inviteOnly ? t('inviteCodes.title') : '管理画面'}>
      {!inviteOnly ? adminCards.map((item) => {
        const Icon = item.icon;
        return <Card className="space-y-2.5 p-3 shadow-sm" key={item.title}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark"><Icon size={18} /></span><span className="text-sm font-black">{item.title}</span></span><Badge>{item.count}</Badge></div><p className="whitespace-pre-line text-[13px] leading-5 text-theme-muted">{item.body}</p></Card>;
      }) : null}

      {inviteOnly ? (
        <Card className="space-y-3 border-theme-main/15 bg-gradient-to-br from-theme-accent-soft/80 to-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('inviteCodes.slotsTitle')}</p>
              <h2 className="mt-1 text-xl font-black text-theme-main-dark">{inviteSlotSummary}</h2>
            </div>
            <Badge>{isFounder ? t('inviteCodes.unlimitedBadge') : `${ownInviteCodeCount} / ${GENERAL_USER_INVITE_CODE_LIMIT}`}</Badge>
          </div>
          <p className="text-[13px] font-bold leading-6 text-theme-muted">{t('inviteCodes.philosophy')}</p>
          <p className="rounded-[1.15rem] bg-white/70 p-3 text-[13px] font-black leading-5 text-theme-main-dark">{inviteLimitReached ? t('inviteCodes.usedAllSlots') : t('inviteCodes.sendToTrusted')}</p>
          {isFounder ? <p className="text-xs font-bold leading-5 text-theme-muted">{t('inviteCodes.founderHint')} <Link className="font-black text-theme-main-dark underline" to="/admin">/admin</Link></p> : null}
        </Card>
      ) : null}

      <Card className="space-y-3 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">{inviteOnly ? t('inviteCodes.createSectionTitle') : 'βテスター用の招待コード'}</h2>
            <p className="mt-1 text-[13px] leading-5 text-theme-muted">{inviteOnly ? t('inviteCodes.createSectionBody') : <>βテスターに共有する招待コードを作成・確認できます。<br />招待コードは、紹介経路を記録するために使います。</>}</p>
          </div>
          <Button aria-label="招待コード候補を生成" className="shrink-0 px-3" disabled={inviteLoading || inviteLimitReached} onClick={handleGenerateInviteCodeCandidate} title="招待コード候補を生成" type="button" variant="secondary">
            <RefreshCw size={15} />
            <span className="hidden sm:inline">{t('inviteCodes.generateCandidate')}</span>
          </Button>
        </div>

        {!isSupabaseMode ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">デモ表示では招待コードは保存されません。画面確認用として表示しています。</div> : null}
        {isSupabaseMode && !isAuthenticated ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">招待コードを作成・確認するにはGoogleログインしてください。</div> : null}
        {!inviteOnly && (isFounder ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold leading-6 text-theme-main-dark">Founder 管理者として、招待コードを無制限に発行できます。</div> : <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted"><p>招待枠: 残り{remainingInviteSlots}人</p><p className="mt-1 text-xs">ConnectBloomは、信頼できる紹介から少しずつ広がる場所です。<br />本当に一緒に使いたい人へ招待を送ってください。</p></div>)}
        {inviteLimitReached ? <div className="rounded-[1.15rem] bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-700">{t('inviteCodes.usedAllSlots')}</div> : null}
        {inviteError ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{inviteError}</div> : null}
        {inviteNotice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{inviteNotice}</div> : null}

        <form className="space-y-3" onSubmit={handleCreateInviteCode}>
          <Input helperText={inviteOnly && !isFounder ? t('inviteCodes.inputHelperGeneral') : 'βテスターに共有する招待コードです。英数字・ハイフン推奨で、保存時に大文字化します。'} label={t('inviteCodes.codeLabel')} name="code" onChange={(event) => updateForm('code', event.target.value.toUpperCase())} placeholder="BLOOM-2026" value={form.code} />
          {inviteOnly && !isFounder ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-xs font-bold leading-5 text-theme-muted">{t('inviteCodes.generalLimitHint')}</p> : (<>
            <div className="rounded-[1.15rem] bg-theme-background/70 p-3">
              <label className="flex items-center gap-2 text-sm font-black text-theme-text">
                <input checked={form.unlimited} className="size-4 accent-theme-main" onChange={(event) => updateForm('unlimited', event.target.checked)} type="checkbox" />
                利用人数を制限しない
              </label>
              <p className="mt-1.5 text-xs leading-5 text-theme-muted">ONの場合、同じ招待コードを人数制限なしで使えます。利用回数は自動で記録されます。</p>
            </div>
            <Input disabled={form.unlimited} helperText="無制限チェックをOFFにした場合のみ有効です。" label="利用上限" min={1} name="maxUses" onChange={(event) => updateForm('maxUses', event.target.value)} placeholder="10" type="number" value={form.maxUses} />
            <Input helperText="未入力なら期限なしです。" label="有効期限" name="expiresAt" onChange={(event) => updateForm('expiresAt', event.target.value)} type="datetime-local" value={form.expiresAt} />
            <label className="flex items-center gap-2 rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-black text-theme-text">
              <input checked={form.isActive} className="size-4 accent-theme-main" onChange={(event) => updateForm('isActive', event.target.checked)} type="checkbox" />
              有効にする
            </label>
          </>)}
          <Button className="w-full" disabled={inviteLoading || inviteLimitReached} type="submit">
            <KeyRound size={16} />
            {inviteLoading ? t('inviteCodes.creating') : (inviteLimitReached ? t('inviteCodes.usedAllSlots') : t('inviteCodes.createButton'))}
          </Button>
        </form>
      </Card>

      <Card className="space-y-2 border-theme-main/15 bg-theme-accent-soft/55 p-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-theme-main-dark">招待コードの扱い</p>
        <p className="text-[13px] leading-5 text-theme-muted">正式参加の配布時は、作成済みの招待コードを共有してください。<br />コード入力後のGoogleログインで、紹介経路として記録されます。</p>
      </Card>

      <Card className="space-y-2.5 p-3 shadow-sm">
        <h2 className="text-sm font-black">{t('inviteCodes.createdCodesTitle')}</h2>
        <p className="text-[13px] leading-5 text-theme-muted">{t('inviteCodes.createdCodesBody')}</p>
        {inviteCodes.length === 0 ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted"><p className="font-black text-theme-text">{t('inviteCodes.emptyTitle')}</p><p>{t('inviteCodes.emptyBody')}</p><p>{t('inviteCodes.emptyLimit')}</p></div> : null}
        {inviteCodes.map((inviteCode) => {
          const isManaging = managingInviteCodeId === inviteCode.id;
          const canDelete = !inviteOnly && inviteCode.is_active && inviteCode.used_count === 0;
          const actionDisabled = inviteLoading || isManaging || !inviteCode.is_active;
          const inviteCodeUsed = inviteCode.used_count > 0;
          const inviteCodeLimitReached = inviteCode.max_uses !== null && inviteCode.used_count >= inviteCode.max_uses;
          const inviteCodeShareable = inviteCode.is_active && !inviteCodeLimitReached;
          const statusLabel = !inviteCode.is_active ? t('inviteCodes.statusInactive') : (inviteCodeShareable ? t('inviteCodes.statusShareable') : t('inviteCodes.statusUsed'));
          const referralRoute = inviteCode.code.split('-')[0] || '';

          return (
            <div className={`space-y-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-3 ${inviteCode.is_active ? '' : 'opacity-70'}`} key={inviteCode.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-theme-muted">{t('inviteCodes.codeLabel')}</p><span className="font-black text-theme-main-dark">{inviteCode.code}</span></div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => void handleCopyInviteCode(inviteCode)} type="button" variant="secondary">
                    <Copy size={14} />
                    {t('inviteCodes.copyCode')}
                  </Button>
                  <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => void handleCopyInviteMessage(inviteCode)} type="button" variant="secondary">
                    <Copy size={14} />
                    {t('inviteCodes.copyInvitationMessage')}
                  </Button>
                  <Badge className={inviteCodeShareable ? '' : 'bg-red-50 text-red-600'}>{statusLabel}</Badge>
                </div>
              </div>
              {(copiedInviteCodeId === inviteCode.id || copiedInviteMessageId === inviteCode.id) ? (
                <div className="flex flex-wrap gap-2 text-xs font-black text-theme-main-dark">
                  {copiedInviteCodeId === inviteCode.id ? <span className="rounded-full bg-white/70 px-2.5 py-1">{t('inviteCodes.copiedCode')}</span> : null}
                  {copiedInviteMessageId === inviteCode.id ? <span className="rounded-full bg-white/70 px-2.5 py-1">{t('inviteCodes.copiedInvitationMessage')}</span> : null}
                </div>
              ) : null}
              <div className="grid gap-2 text-xs font-bold text-theme-muted sm:grid-cols-2">
                <span>{t('inviteCodes.status')}: {statusLabel}</span>
                <span>{t('inviteCodes.usage')}: {inviteCodeUsed ? t('inviteCodes.used') : t('inviteCodes.unused')}</span>
                <span>{t('inviteCodes.usageCount')}: {inviteCode.used_count} / {inviteCode.max_uses ?? t('inviteCodes.noLimit')}</span>
                {referralRoute ? <span>{t('inviteCodes.referralRoute')}: {referralRoute}</span> : null}
                <span>{t('inviteCodes.expiresAt')}: {formatDateTime(inviteCode.expires_at, t('inviteCodes.noExpiry'), locale)}</span>
                <span>{t('inviteCodes.createdAt')}: {formatDateTime(inviteCode.created_at, t('inviteCodes.noExpiry'), locale)}</span>
              </div>
              <div className="flex justify-end">
                {canDelete ? (
                  <Button className="min-h-9 px-3 py-1.5" disabled={actionDisabled} onClick={() => handleDeleteInviteCode(inviteCode)} type="button" variant="danger">
                    {isManaging ? '削除中...' : '削除'}
                  </Button>
                ) : (
                  <Button className="min-h-9 px-3 py-1.5" disabled={actionDisabled} onClick={() => handleDeactivateInviteCode(inviteCode)} type="button" variant={inviteCode.is_active ? 'secondary' : 'ghost'}>
                    {inviteCode.is_active ? (isManaging ? t('inviteCodes.deactivating') : t('inviteCodes.deactivate')) : t('inviteCodes.deactivated')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {!inviteOnly ? <Card className="space-y-2.5 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">募集管理</h2>
            <p className="mt-1 text-[13px] leading-5 text-theme-muted">非表示にした募集を確認し、必要に応じて再表示または完全削除できます。</p>
          </div>
          <Badge>{isSupabaseMode && isAuthenticated ? `${archivedActivityPosts.length}件` : 'ログイン後'}</Badge>
        </div>

        {activityPostError ? <p className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{activityPostError}</p> : null}
        {activityPostNotice ? <p className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{activityPostNotice}</p> : null}
        {!isSupabaseMode || !isAuthenticated ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">非表示募集の管理は管理者ログイン後に利用できます。</p> : null}
        {isSupabaseMode && isAuthenticated && loadingActivityPosts ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">非表示募集を読み込んでいます。</p> : null}
        {isSupabaseMode && isAuthenticated && !loadingActivityPosts && archivedActivityPosts.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">非表示中の募集はありません。</p> : null}
        {archivedActivityPosts.map((post) => {
          const isManagingPost = managingActivityPostId === post.id;
          const bodyPreview = post.body.length > 120 ? `${post.body.slice(0, 120)}…` : post.body;

          return (
            <article className="space-y-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-3" key={post.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-theme-text">{post.title}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">{bodyPreview}</p>
                </div>
                <Badge className="bg-theme-background text-theme-main-dark">{post.status}</Badge>
              </div>
              <div className="grid gap-1.5 text-xs font-bold text-theme-muted sm:grid-cols-2">
                <span>投稿者: {post.author?.name ?? '不明'}</span>
                <span>作成日時: {formatDateTime(post.created_at, '未記録', locale)}</span>
                <span>ステータス: {post.status}</span>
                <span>参加希望: {post.interest_count}件</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button className="min-h-9 px-3 py-1.5" disabled={isManagingPost} onClick={() => { void handleRestoreActivityPost(post); }} type="button" variant="secondary">
                  <ArchiveRestore size={16} />
                  {isManagingPost ? '更新中...' : '再表示する'}
                </Button>
                <Button className="min-h-9 px-3 py-1.5" disabled={isManagingPost} onClick={() => { void handleDeleteActivityPost(post); }} type="button" variant="danger">
                  <Trash2 size={16} />
                  {isManagingPost ? '削除中...' : '完全削除'}
                </Button>
              </div>
            </article>
          );
        })}
      </Card> : null}

      {!inviteOnly ? <Card className="space-y-2.5 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">通報管理</h2>
            <p className="mt-1 text-[13px] leading-5 text-theme-muted">届いた通報を確認し、必要に応じて対応できます。</p>
          </div>
          <Badge>{isSupabaseMode && isAuthenticated ? '届いた通報' : 'デモ表示'}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-theme-background text-theme-main-dark">通報 {displayedReportStats.total}件</Badge>
          <Badge className={getReportStatusBadgeClass('open')}>未対応 {displayedReportStats.open}件</Badge>
          <Badge className={getReportStatusBadgeClass('reviewing')}>確認中 {displayedReportStats.reviewing}件</Badge>
          <Badge className={getReportStatusBadgeClass('resolved')}>対応済み {displayedReportStats.resolved}件</Badge>
          <Badge className={getReportStatusBadgeClass('dismissed')}>対応不要 {displayedReportStats.dismissed}件</Badge>
        </div>

        {isSupabaseMode && isAuthenticated ? (
          <label className="inline-flex w-fit items-center gap-2 rounded-full bg-theme-background/80 px-3 py-1.5 text-xs font-black text-theme-muted">
            <input checked={includeArchivedReports} className="size-4 accent-theme-main" onChange={(event) => setIncludeArchivedReports(event.target.checked)} type="checkbox" />
            アーカイブ済みも表示
          </label>
        ) : null}

        {reportError ? <p className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{reportError}</p> : null}
        {reportNotice ? <p className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{reportNotice}</p> : null}
        {isSupabaseMode && isAuthenticated ? (
          <>
            {supabaseReports.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ通報はありません。プロフィールまたは会話画面の通報ボタンから反映されます。</p> : null}
            {supabaseReports.map((report) => {
              const isUpdatingStatus = updatingReportStatusId === report.id;
              const isSavingNote = savingReportNoteId === report.id;
              const isArchiving = archivingReportId === report.id;
              const isUpdatingAccount = updatingAccountStatusUserId === report.reported_user_id;
              const isFounderTarget = report.reported_user_id === user?.id;
              const isReportedUserSuspended = report.reportedUserAccountStatus === 'suspended';
              const isExpanded = expandedReportId === report.id;
              const isArchived = Boolean(report.archived_at);
              const archiveAllowed = canArchiveReport(report);
              const noteDraft = reportNoteDrafts[report.id] ?? '';

              return (
                <article className={`overflow-hidden rounded-[1.25rem] border border-theme-main/10 bg-theme-accent-soft/35 ${isExpanded ? 'shadow-sm shadow-theme-main/10' : ''}`} key={report.id}>
                  <button
                    aria-expanded={isExpanded}
                    className="grid w-full gap-2.5 p-3 text-left transition hover:bg-white/35"
                    onClick={() => toggleReport(report.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {report.reportedUser ? <ProfileAvatar className="size-10 shrink-0 rounded-xl" fallbackClassName="font-black" user={report.reportedUser} /> : null}
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold text-theme-muted">通報された相手</p>
                          <p className="break-all font-black text-theme-main-dark">{report.reportedUser?.name ?? report.reported_user_id}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isArchived ? <Badge className="bg-slate-100 text-slate-600">アーカイブ済み</Badge> : null}
                        <Badge className={getReportStatusBadgeClass(report.status)}>{getReportStatusLabel(report.status)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-theme-muted">
                      <span className="break-words">理由: {report.reason}</span>
                      <span>通報日時: {formatDateTime(report.created_at)}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 self-start text-xs font-black text-theme-main-dark">
                      {isExpanded ? '閉じる' : '詳細を見る'}
                      <ChevronDown className={`transition ${isExpanded ? 'rotate-180' : ''}`} size={14} />
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-white/70 p-3 pt-3">
                      <div className="grid gap-2 rounded-[1rem] bg-white/60 p-3 text-xs font-bold leading-5 text-theme-muted sm:grid-cols-2">
                        <span className="break-words">通報された相手: {report.reportedUser?.name ?? report.reported_user_id}</span>
                        <span className="break-words">通報者: {report.reporter?.name ?? report.reporter_id}</span>
                        <span className="break-words">理由: {report.reason}</span>
                        <span className="break-words">補足: {report.detail || '未入力'}</span>
                        <span>対応状況: {getReportStatusLabel(report.status)}</span>
                        <span>通報日時: {formatDateTime(report.created_at)}</span>
                        <span>確認日時: {formatDateTime(report.reviewed_at, '未確認')}</span>
                        <span className="break-words">管理メモ: {report.admin_note || '未入力'}</span>
                        <span>整理日時: {formatDateTime(report.archived_at, '未整理')}</span>
                        <span>対象募集: {report.target_activity_post_id ? 'あり' : '未設定'}</span>
                        <span>対象ルーム発言: {report.target_chat_room_message_id ? 'あり' : '未設定'}</span>
                        <span>利用状態: {isReportedUserSuspended ? '利用停止中' : '利用中'}</span>
                      </div>

                      <div className="rounded-[1rem] bg-white/60 p-3">
                        <p className="text-xs font-black text-theme-text">対象へ移動</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                          <Link className="rounded-full bg-theme-background px-3 py-2 text-theme-main-dark" to={`/profile/${report.reported_user_id}`}>対象ユーザーのプロフィールへ移動</Link>
                          {report.target_activity_post_id ? <Link className="rounded-full bg-theme-background px-3 py-2 text-theme-main-dark" to={`/board/${report.target_activity_post_id}`}>対象募集へ移動</Link> : <span className="rounded-full bg-theme-background/70 px-3 py-2 text-theme-muted">対象募集なし</span>}
                          {report.targetChatRoomSlug ? <Link className="rounded-full bg-theme-background px-3 py-2 text-theme-main-dark" to={`/rooms/${report.targetChatRoomSlug}`}>対象ルーム発言へ移動</Link> : <span className="rounded-full bg-theme-background/70 px-3 py-2 text-theme-muted">対象ルーム発言なし</span>}
                        </div>
                      </div>

                      <div className="rounded-[1rem] bg-amber-50/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-theme-text">ユーザー利用制限</p>
                            <p className="text-xs font-bold leading-5 text-theme-muted">ログイン自体は残し、主要機能へのアクセスを制限します。</p>
                            {isFounderTarget ? <p className="text-xs font-black text-amber-700">Founder は利用停止できません。</p> : null}
                          </div>
                          {!isFounderTarget ? (
                            <Button disabled={isUpdatingStatus || isSavingNote || isArchiving || isUpdatingAccount} onClick={() => { void handleToggleReportedUserStatus(report); }} type="button" variant={isReportedUserSuspended ? 'secondary' : 'danger'}>
                              {isUpdatingAccount ? '更新中...' : isReportedUserSuspended ? '利用停止を解除する' : 'ユーザーを利用停止にする'}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <label className="grid gap-1.5 text-sm font-black text-theme-text">
                        対応状況
                        <select
                          className="min-h-11 w-full rounded-[1rem] border border-theme-sky/25 bg-white px-3 text-sm font-bold text-theme-text outline-none transition focus:border-theme-cyan focus:ring-2 focus:ring-theme-cyan/20 disabled:opacity-60"
                          disabled={isUpdatingStatus || isSavingNote || isArchiving}
                          onChange={(event) => handleUpdateReportStatus(report, event.target.value as ReportStatus)}
                          value={report.status}
                        >
                          {reportStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>

                      <div className="space-y-2">
                        <label className="grid gap-1.5 text-sm font-black text-theme-text">
                          管理メモ
                          <textarea
                            className="min-h-24 w-full resize-y rounded-[1rem] border border-theme-sky/25 bg-white px-3 py-2 text-sm font-bold leading-6 text-theme-text outline-none transition placeholder:text-theme-muted/70 focus:border-theme-cyan focus:ring-2 focus:ring-theme-cyan/20 disabled:opacity-60"
                            disabled={isUpdatingStatus || isSavingNote || isArchiving}
                            onChange={(event) => updateReportNoteDraft(report.id, event.target.value)}
                            placeholder="対応方針や確認メモを、必要な範囲だけ残します。"
                            value={noteDraft}
                          />
                        </label>
                        <div className="flex justify-end">
                          <Button className="min-h-9 px-3 py-1.5" disabled={isUpdatingStatus || isSavingNote || isArchiving} onClick={() => handleSaveReportAdminNote(report)} type="button" variant="secondary">
                            {isSavingNote ? '保存中...' : 'メモを保存'}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-[1rem] bg-theme-background/70 p-3">
                        <p className="text-xs font-bold leading-5 text-theme-muted">対応済み・対応不要の通報だけアーカイブできます。<br />履歴は残しながら通常の一覧から整理します。</p>
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <Button disabled={isUpdatingStatus || isSavingNote || isArchiving || !archiveAllowed} onClick={() => handleToggleReportArchive(report)} type="button" variant={isArchived ? 'secondary' : 'ghost'}>
                            {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                            {isArchiving ? '整理中...' : isArchived ? 'アーカイブ解除' : 'アーカイブ'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </>
        ) : (
          <>
            <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">デモ表示では通報済みユーザーの仮表示を維持します。<br />対応状況の更新・管理メモ保存・アーカイブはログイン後に利用できます。</p>
            {reportedUsers.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ通報はありません。プロフィールまたは会話画面の通報ボタンから反映されます。</p> : null}
            {reportedUsers.map((reportedUser) => (
              <div className="flex items-center gap-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-2.5" key={reportedUser.id}>
                <ProfileAvatar className="size-10 rounded-xl" fallbackClassName="font-black" user={reportedUser} />
                <span className="min-w-0 flex-1"><span className="block font-bold">{reportedUser.name}</span><span className="block text-xs text-theme-muted">{reportedUser.location}</span></span>
                <Badge className="bg-red-50 text-red-600">通報済み</Badge>
              </div>
            ))}
          </>
        )}
      </Card> : null}
    </PageShell>
  );
}
