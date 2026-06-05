import { Archive, ArchiveRestore, ChevronDown, Copy, KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { createInviteCode, deactivateInviteCode, deleteInviteCode, getManagedInviteCodes, getMyInviteCodes, type InviteCodeRow } from '../lib/inviteCodeApi';
import { archiveReport, getAdminReports, unarchiveReport, updateReportAdminNote, updateReportStatus } from '../lib/reportApi';
import { GENERAL_USER_INVITE_CODE_LIMIT } from '../lib/admin';
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

function formatDateTime(value: string | null, emptyLabel = '期限なし') {
  if (!value) return emptyLabel;
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AdminPage({ inviteOnly = false }: { inviteOnly?: boolean } = {}) {
  const { reportedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { isFounder } = useAdmin();
  const [inviteCodes, setInviteCodes] = useState<InviteCodeRow[]>([]);
  const [supabaseReports, setSupabaseReports] = useState<ReportWithProfiles[]>([]);
  const [reportError, setReportError] = useState('');
  const [reportNotice, setReportNotice] = useState('');
  const [reportNoteDrafts, setReportNoteDrafts] = useState<Record<string, string>>({});
  const [updatingReportStatusId, setUpdatingReportStatusId] = useState<string | null>(null);
  const [savingReportNoteId, setSavingReportNoteId] = useState<string | null>(null);
  const [archivingReportId, setArchivingReportId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [includeArchivedReports, setIncludeArchivedReports] = useState(false);
  const [form, setForm] = useState<InviteCodeForm>(defaultInviteCodeForm);
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
  const inviteCountLabel = useMemo(() => {
    if (!isSupabaseMode) return 'デモ表示';
    if (!isAuthenticated) return '未ログイン';
    return isFounder ? `${inviteCodes.length}件` : `${ownInviteCodeCount}/${GENERAL_USER_INVITE_CODE_LIMIT}件`;
  }, [inviteCodes.length, isAuthenticated, isFounder, isSupabaseMode, ownInviteCodeCount]);
  const adminCards = [
    { icon: KeyRound, title: '招待コード管理', count: inviteCountLabel, body: 'βテスターに共有する招待コードを作成・確認できます。\n招待コードは、紹介経路を記録するために使います。' },
    { icon: ShieldAlert, title: '通報管理', count: `${reportCount}件`, body: '届いた通報を確認し、必要に応じて対応できます。' },
  ];

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
        if (!ignore) setReportError(caughtError instanceof Error ? caughtError.message : '通報一覧の取得に失敗しました。');
      });

    return () => {
      ignore = true;
    };
  }, [includeArchivedReports, isAuthenticated, isFounder, isSupabaseMode, user]);

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
      '以下のページから参加できます。',
      connectBloomShareUrl,
      '',
      'ConnectBloomは、紹介から始まる招待制コネクトSNSです。',
      '気づいた点があれば、スクリーンショットと一緒に共有してもらえると助かります。',
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

    const parsedMaxUses = Number(form.maxUses);
    if (!form.unlimited && (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0)) {
      setInviteError('利用上限は1以上の整数で入力してください。');
      return;
    }
    const maxUses = form.unlimited ? null : parsedMaxUses;

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
      setInviteNotice(`${createdInviteCode.code} を作成しました。一覧に反映しました。`);
      setForm(defaultInviteCodeForm);
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
      setReportError(caughtError instanceof Error ? `ステータス更新に失敗しました（${caughtError.message}）` : 'ステータス更新に失敗しました');
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
      setReportError(caughtError instanceof Error ? `管理メモの保存に失敗しました（${caughtError.message}）` : '管理メモの保存に失敗しました');
    } finally {
      setSavingReportNoteId(null);
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
      setReportError(caughtError instanceof Error ? `通報の整理に失敗しました（${caughtError.message}）` : '通信に失敗しました。少し時間を置いてもう一度お試しください');
    } finally {
      setArchivingReportId(null);
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
    <PageShell description={inviteOnly ? <>招待コードを作成・確認できます。<br />ConnectBloomは、信頼できる紹介から少しずつ広がる場所です。</> : <>βテスター用の招待コード作成と、届いた通報の確認を行えます。<br />将来的に不適切な募集・ルーム発言・通報ユーザー・アカウント停止などを管理できるよう拡張する前提です。</>} eyebrow={inviteOnly ? 'Invite slots' : 'Admin'} title={inviteOnly ? '招待コード' : '管理画面'}>
      {!inviteOnly ? adminCards.map((item) => {
        const Icon = item.icon;
        return <Card className="space-y-2.5 p-3 shadow-sm" key={item.title}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark"><Icon size={18} /></span><span className="text-sm font-black">{item.title}</span></span><Badge>{item.count}</Badge></div><p className="whitespace-pre-line text-[13px] leading-5 text-theme-muted">{item.body}</p></Card>;
      }) : null}

      <Card className="space-y-3 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">βテスター用の招待コード</h2>
            <p className="mt-1 text-[13px] leading-5 text-theme-muted">βテスターに共有する招待コードを作成・確認できます。<br />招待コードは、紹介経路を記録するために使います。</p>
          </div>
          <Button aria-label="招待コード候補を生成" className="shrink-0 px-3" disabled={inviteLoading} onClick={handleGenerateInviteCodeCandidate} title="招待コード候補を生成" type="button" variant="secondary">
            <RefreshCw size={15} />
            <span className="hidden sm:inline">候補を作る</span>
          </Button>
        </div>

        {!isSupabaseMode ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">デモ表示では招待コードは保存されません。画面確認用として表示しています。</div> : null}
        {isSupabaseMode && !isAuthenticated ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">招待コードを作成・確認するにはGoogleログインしてください。</div> : null}
        {isFounder ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold leading-6 text-theme-main-dark">Founder 管理者として、招待コードを無制限に発行できます。</div> : <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted"><p>招待枠: 残り{remainingInviteSlots}人</p><p className="mt-1 text-xs">ConnectBloomは、信頼できる紹介から少しずつ広がる場所です。<br />本当に一緒に使いたい人へ招待を送ってください。</p></div>}
        {inviteLimitReached ? <div className="rounded-[1.15rem] bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-700">招待枠を使い切りました。<br />追加の招待が必要な場合は、管理者に相談してください。</div> : null}
        {inviteError ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{inviteError}</div> : null}
        {inviteNotice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{inviteNotice}</div> : null}

        <form className="space-y-3" onSubmit={handleCreateInviteCode}>
          <Input helperText="βテスターに共有する招待コードです。英数字・ハイフン推奨で、保存時に大文字化します。" label="招待コード" name="code" onChange={(event) => updateForm('code', event.target.value.toUpperCase())} placeholder="MYPACE-2026" value={form.code} />
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
          <Button className="w-full" disabled={inviteLoading || inviteLimitReached} type="submit">
            <KeyRound size={16} />
            {inviteLoading ? '保存中...' : '招待コードを作成'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-2 border-theme-main/15 bg-theme-accent-soft/55 p-3 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-theme-main-dark">招待コードの扱い</p>
        <p className="text-[13px] leading-5 text-theme-muted">正式参加の配布時は、作成済みの招待コードを共有してください。<br />コード入力後のGoogleログインで、紹介経路として記録されます。</p>
      </Card>

      <Card className="space-y-2.5 p-3 shadow-sm">
        <h2 className="text-sm font-black">作成済みの招待コード</h2>
        <p className="text-[13px] leading-5 text-theme-muted">有効な招待コードをβテスターに共有してください。<br />各コードから、コード単体または参加ページ付きの招待文をコピーできます。</p>
        {inviteCodes.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ招待コードはありません。まずはβテスター向けのコードを1つ作成してください。</p> : null}
        {inviteCodes.map((inviteCode) => {
          const isManaging = managingInviteCodeId === inviteCode.id;
          const canDelete = inviteCode.is_active && inviteCode.used_count === 0;
          const actionDisabled = inviteLoading || isManaging || !inviteCode.is_active;

          return (
            <div className={`space-y-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-3 ${inviteCode.is_active ? '' : 'opacity-70'}`} key={inviteCode.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-theme-main-dark">{inviteCode.code}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => void handleCopyInviteCode(inviteCode)} type="button" variant="secondary">
                    <Copy size={14} />
                    コードをコピー
                  </Button>
                  <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => void handleCopyInviteMessage(inviteCode)} type="button" variant="secondary">
                    <Copy size={14} />
                    招待文をコピー
                  </Button>
                  <Badge className={inviteCode.is_active ? '' : 'bg-red-50 text-red-600'}>{inviteCode.is_active ? '有効' : '無効'}</Badge>
                </div>
              </div>
              {(copiedInviteCodeId === inviteCode.id || copiedInviteMessageId === inviteCode.id) ? (
                <div className="flex flex-wrap gap-2 text-xs font-black text-theme-main-dark">
                  {copiedInviteCodeId === inviteCode.id ? <span className="rounded-full bg-white/70 px-2.5 py-1">招待コードをコピーしました</span> : null}
                  {copiedInviteMessageId === inviteCode.id ? <span className="rounded-full bg-white/70 px-2.5 py-1">招待文をコピーしました</span> : null}
                </div>
              ) : null}
              <div className="grid gap-2 text-xs font-bold text-theme-muted sm:grid-cols-2">
                <span>使用状況: {inviteCode.used_count} / {inviteCode.max_uses ?? '上限なし'}</span>
                <span>紹介経路: {inviteCode.code.split('-')[0] || '未設定'}</span>
                <span>発行者: ログイン中の管理者</span>
                <span>状態: {inviteCode.is_active ? '共有できます' : '停止中'}</span>
                <span>有効期限: {formatDateTime(inviteCode.expires_at)}</span>
                <span>作成日時: {formatDateTime(inviteCode.created_at)}</span>
              </div>
              <div className="flex justify-end">
                {canDelete ? (
                  <Button className="min-h-9 px-3 py-1.5" disabled={actionDisabled} onClick={() => handleDeleteInviteCode(inviteCode)} type="button" variant="danger">
                    {isManaging ? '削除中...' : '削除'}
                  </Button>
                ) : (
                  <Button className="min-h-9 px-3 py-1.5" disabled={actionDisabled} onClick={() => handleDeactivateInviteCode(inviteCode)} type="button" variant={inviteCode.is_active ? 'secondary' : 'ghost'}>
                    {inviteCode.is_active ? (isManaging ? '無効化中...' : '無効化') : '無効化済み'}
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
