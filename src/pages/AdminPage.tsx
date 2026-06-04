import { Archive, ArchiveRestore, ChevronDown, KeyRound, RefreshCw, ShieldAlert, UsersRound } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { createInviteCode, deactivateInviteCode, deleteInviteCode, getMyInviteCodes, type InviteCodeRow } from '../lib/inviteCodeApi';
import { archiveReport, getAdminReports, unarchiveReport, updateReportAdminNote, updateReportStatus } from '../lib/reportApi';
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

export function AdminPage() {
  const { blockedUserIds, reportedUserIds } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
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
  const inviteCountLabel = useMemo(() => {
    if (!isSupabaseMode) return 'ローカル';
    if (!isAuthenticated) return '未ログイン';
    return `${inviteCodes.length}件`;
  }, [inviteCodes.length, isAuthenticated, isSupabaseMode]);
  const adminCards = [
    { icon: KeyRound, title: '招待コード管理', count: inviteCountLabel, body: 'βテスターに共有する招待コードの作成・確認・無効化を行います。' },
    { icon: UsersRound, title: 'ユーザー管理', count: `${mockUsers.length}人`, body: 'プロフィール確認とステータス管理のプレースホルダーです。' },
    { icon: ShieldAlert, title: '通報管理', count: `${reportCount}件`, body: isSupabaseMode && isAuthenticated ? '安心してご縁を育てるため、通報内容・対応状況・管理メモを落ち着いて確認します。' : `ブロック ${blockedUserIds.length}件 / 通報 ${reportedUserIds.length}件のローカル集計です。` },
  ];

  useEffect(() => {
    if (!isSupabaseMode || !isAuthenticated || !user) return undefined;

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
  }, [includeArchivedReports, isAuthenticated, isSupabaseMode, user]);

  useEffect(() => {
    if (!isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;
    getMyInviteCodes(user.id)
      .then((nextInviteCodes) => {
        if (!ignore) setInviteCodes(nextInviteCodes);
      })
      .catch((caughtError: unknown) => {
        if (!ignore) setInviteError(caughtError instanceof Error ? caughtError.message : '招待コード一覧の取得に失敗しました。');
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isSupabaseMode, user]);

  function updateForm(field: keyof InviteCodeForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleGenerateInviteCodeCandidate() {
    const nextCode = generateInviteCodeCandidate();
    setInviteError('');
    setInviteNotice(`${nextCode} を候補として作成しました。保存するまではDBに登録されません。ご縁のルートが分かるよう、手入力で調整してもOKです。`);
    setForm((current) => ({ ...current, code: nextCode }));
  }

  async function handleCreateInviteCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError('');
    setInviteNotice('');

    if (!isSupabaseMode) {
      setInviteNotice('ローカルデモではSupabaseに保存せず、UI確認だけできます。');
      return;
    }

    if (!isAuthenticated || !user) {
      setInviteError('招待コードを作成するにはログインしてください。');
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
      setInviteNotice(`${createdInviteCode.code} を作成しました。一覧に反映しました。無制限コードは max_uses = null で保存されます。`);
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
      setInviteNotice('ローカルデモではSupabaseに保存されていないため、削除操作はUI確認のみです。');
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
      setReportError('ステータス更新はSupabase接続時に管理できます。');
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
      setReportError('管理メモ保存はSupabase接続時に管理できます。');
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
      setReportError('通報の整理はSupabase接続時に管理できます。');
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
      setInviteNotice('ローカルデモではSupabaseに保存されていないため、無効化操作はUI確認のみです。');
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

  return (
    <PageShell description="紹介制・信頼ベースを運用するための管理画面です。βテスター用の招待コードを作成・確認できます。" eyebrow="Admin" title="管理画面">
      {adminCards.map((item) => {
        const Icon = item.icon;
        return <Card className="space-y-3" key={item.title}><div className="flex items-center justify-between"><span className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark"><Icon size={22} /></span><span className="font-black">{item.title}</span></span><Badge>{item.count}</Badge></div><p className="text-sm leading-6 text-theme-muted">{item.body}</p></Card>;
      })}

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black">βテスター用の招待コード</h2>
            <p className="mt-1 text-sm leading-6 text-theme-muted">少人数テスターに共有する招待コードを作成・確認できます。右上のボタンでコード候補を自動生成できます。招待コードは信頼できるテスターにだけ共有してください。</p>
          </div>
          <Button aria-label="招待コード候補を生成" className="shrink-0 px-3" disabled={inviteLoading} onClick={handleGenerateInviteCodeCandidate} title="招待コード候補を生成" type="button" variant="secondary">
            <RefreshCw size={15} />
            <span className="hidden sm:inline">候補を作る</span>
          </Button>
        </div>

        {!isSupabaseMode ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">Supabase未接続のため、招待コードは保存されません。UI確認用として表示しています。</div> : null}
        {isSupabaseMode && !isAuthenticated ? <div className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">招待コードを作成・確認するにはGoogleログインしてください。</div> : null}
        {inviteError ? <div className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{inviteError}</div> : null}
        {inviteNotice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{inviteNotice}</div> : null}

        <form className="space-y-3" onSubmit={handleCreateInviteCode}>
          <Input helperText="テスターにそのまま渡す招待コードです。英数字・ハイフン推奨で、保存時に大文字化します。" label="招待コード" name="code" onChange={(event) => updateForm('code', event.target.value.toUpperCase())} placeholder="MYPACE-2026" value={form.code} />
          <div className="rounded-[1.15rem] bg-theme-background/70 p-3">
            <label className="flex items-center gap-2 text-sm font-black text-theme-text">
              <input checked={form.unlimited} className="size-4 accent-theme-main" onChange={(event) => updateForm('unlimited', event.target.checked)} type="checkbox" />
              無制限にする（max_uses = null）
            </label>
            <p className="mt-1.5 text-xs leading-5 text-theme-muted">ONの場合、同じ招待コードを人数制限なしで使えます。used_count は毎回増えます。</p>
          </div>
          <Input disabled={form.unlimited} helperText="無制限チェックをOFFにした場合のみ有効です。" label="max_uses" min={1} name="maxUses" onChange={(event) => updateForm('maxUses', event.target.value)} placeholder="10" type="number" value={form.maxUses} />
          <Input helperText="未入力なら期限なしです。" label="expires_at" name="expiresAt" onChange={(event) => updateForm('expiresAt', event.target.value)} type="datetime-local" value={form.expiresAt} />
          <label className="flex items-center gap-2 rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-black text-theme-text">
            <input checked={form.isActive} className="size-4 accent-theme-main" onChange={(event) => updateForm('isActive', event.target.checked)} type="checkbox" />
            is_active（有効）
          </label>
          <Button className="w-full" disabled={inviteLoading} type="submit">
            <KeyRound size={16} />
            {inviteLoading ? '保存中...' : '招待コードを作成'}
          </Button>
        </form>
      </Card>

      <Card className="space-y-2 border-theme-main/15 bg-theme-accent-soft/55 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">テスターに共有する時の案内</p>
        <p className="text-sm leading-6 text-theme-muted">「ConnectBloomは、共通の興味から仲間とつながる紹介制コネクトSNSです。まだβ版なので、気づいた点はスクリーンショットで教えてください。」</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-black">作成済みの招待コード</h2>
        <p className="text-sm leading-6 text-theme-muted">有効なコードをテスターに共有してください。利用状況を見ながら、不要になったコードは削除または無効化できます。</p>
        {inviteCodes.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ招待コードはありません。まずはβテスター向けのコードを1つ作成してください。</p> : null}
        {inviteCodes.map((inviteCode) => {
          const isManaging = managingInviteCodeId === inviteCode.id;
          const canDelete = inviteCode.is_active && inviteCode.used_count === 0;
          const actionDisabled = inviteLoading || isManaging || !inviteCode.is_active;

          return (
            <div className={`space-y-3 rounded-[1.15rem] bg-theme-accent-soft/45 p-3 ${inviteCode.is_active ? '' : 'opacity-70'}`} key={inviteCode.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-theme-main-dark">{inviteCode.code}</span>
                <Badge className={inviteCode.is_active ? '' : 'bg-red-50 text-red-600'}>{inviteCode.is_active ? '有効' : '無効'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-theme-muted">
                <span>used_count: {inviteCode.used_count}</span>
                <span>max_uses: {inviteCode.max_uses ?? 'null'}</span>
                <span>無制限: {inviteCode.max_uses === null ? 'はい' : 'いいえ'}</span>
                <span>ステータス: {inviteCode.is_active ? '有効' : '無効'}</span>
                <span>is_active: {inviteCode.is_active ? 'true' : 'false'}</span>
                <span>expires_at: {formatDateTime(inviteCode.expires_at)}</span>
                <span>created_at: {formatDateTime(inviteCode.created_at)}</span>
                <span className="col-span-2 break-all">created_by: {inviteCode.created_by}</span>
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

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black">通報管理</h2>
            <p className="mt-1 text-sm leading-6 text-theme-muted">通報は責めるためではなく、安心してご縁を育てるための運営メモとして扱います。</p>
          </div>
          <Badge>{isSupabaseMode && isAuthenticated ? 'Supabase reports' : 'ローカルデモ'}</Badge>
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
            {supabaseReports.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ通報はありません。プロフィールまたは会話画面の通報ボタンから reports テーブルへ保存されます。</p> : null}
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
                    className="grid w-full gap-3 p-3 text-left transition hover:bg-white/35"
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
                      <div className="grid gap-2 rounded-[1rem] bg-white/60 p-3 text-xs font-bold leading-5 text-theme-muted">
                        <span className="break-words">通報された相手: {report.reportedUser?.name ?? report.reported_user_id}</span>
                        <span className="break-words">通報者: {report.reporter?.name ?? report.reporter_id}</span>
                        <span className="break-words">理由: {report.reason}</span>
                        <span className="break-words">補足: {report.detail || '未入力'}</span>
                        <span>ステータス: {getReportStatusLabel(report.status)}（{report.status}）</span>
                        <span>通報日時: {formatDateTime(report.created_at)}</span>
                        <span>reviewed_at: {formatDateTime(report.reviewed_at, '未レビュー')}</span>
                        <span className="break-words">admin_note: {report.admin_note || '未入力'}</span>
                        <span>archived_at: {formatDateTime(report.archived_at, '未アーカイブ')}</span>
                      </div>

                      <label className="grid gap-1.5 text-sm font-black text-theme-text">
                        ステータス変更
                        <select
                          className="min-h-11 w-full rounded-[1rem] border border-theme-sky/25 bg-white px-3 text-sm font-bold text-theme-text outline-none transition focus:border-theme-cyan focus:ring-2 focus:ring-theme-cyan/20 disabled:opacity-60"
                          disabled={isUpdatingStatus || isSavingNote || isArchiving}
                          onChange={(event) => handleUpdateReportStatus(report, event.target.value as ReportStatus)}
                          value={report.status}
                        >
                          {reportStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}（{option.value}）</option>)}
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
                        <p className="text-xs font-bold leading-5 text-theme-muted">対応済み・対応不要の通報だけアーカイブできます。履歴は残しながら通常の一覧から整理します。</p>
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
            <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">ローカルデモでは通報済みユーザーの仮表示を維持します。ステータス更新・管理メモ保存・アーカイブはSupabase接続時に管理できます。</p>
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
      </Card>
    </PageShell>
  );
}
