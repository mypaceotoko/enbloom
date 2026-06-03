import { KeyRound, RefreshCw, ShieldAlert, UsersRound } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { createInviteCode, deactivateInviteCode, deleteInviteCode, getMyInviteCodes, type InviteCodeRow } from '../lib/inviteCodeApi';
import { getAdminReports, updateReportAdminNote, updateReportStatus } from '../lib/reportApi';
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

const inviteCodePrefixes = ['GOEN', 'BLOOM', 'ENBLOOM', 'MYPACE', 'SAKURA'];
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
  const [form, setForm] = useState<InviteCodeForm>(defaultInviteCodeForm);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [managingInviteCodeId, setManagingInviteCodeId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const reportedUsers = mockUsers.filter((mockUser) => reportedUserIds.includes(mockUser.id));
  const reportCount = isSupabaseMode && isAuthenticated ? supabaseReports.length : reportedUserIds.length;
  const inviteCountLabel = useMemo(() => {
    if (!isSupabaseMode) return 'ローカル';
    if (!isAuthenticated) return '未ログイン';
    return `${inviteCodes.length}件`;
  }, [inviteCodes.length, isAuthenticated, isSupabaseMode]);
  const adminCards = [
    { icon: KeyRound, title: '招待コード管理', count: inviteCountLabel, body: '紹介者に紐づいた無制限利用コードの発行・利用状況・期限管理です。' },
    { icon: UsersRound, title: 'ユーザー管理', count: `${mockUsers.length}人`, body: 'プロフィール確認とステータス管理のプレースホルダーです。' },
    { icon: ShieldAlert, title: '通報管理', count: `${reportCount}件`, body: isSupabaseMode && isAuthenticated ? '安心してご縁を育てるため、通報内容・対応状況・管理メモを落ち着いて確認します。' : `ブロック ${blockedUserIds.length}件 / 通報 ${reportedUserIds.length}件のローカル集計です。` },
  ];

  useEffect(() => {
    if (!isSupabaseMode || !isAuthenticated || !user) return undefined;

    let ignore = false;
    getAdminReports()
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
  }, [isAuthenticated, isSupabaseMode, user]);

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
    <PageShell description="紹介制・信頼ベースを運用するための管理画面です。ログイン中ユーザーは自分用の招待コードを発行できます。" eyebrow="Admin" title="管理画面">
      {adminCards.map((item) => {
        const Icon = item.icon;
        return <Card className="space-y-3" key={item.title}><div className="flex items-center justify-between"><span className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark"><Icon size={22} /></span><span className="font-black">{item.title}</span></span><Badge>{item.count}</Badge></div><p className="text-sm leading-6 text-theme-muted">{item.body}</p></Card>;
      })}

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black">招待コード作成</h2>
            <p className="mt-1 text-sm leading-6 text-theme-muted">デフォルトは無制限です。MYPACE-2026 のようなコードを作ると、同じコードを何人でも利用できます。右上のボタンでコード候補を自動生成できます。自分で分かりやすいコードを手入力してもOKです。</p>
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
          <Input helperText="英数字・ハイフン推奨。保存時に大文字化します。自動生成候補は保存ボタンを押すまで登録されません。" label="code" name="code" onChange={(event) => updateForm('code', event.target.value.toUpperCase())} placeholder="MYPACE-2026" value={form.code} />
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

      <Card className="space-y-3">
        <h2 className="font-black">自分が作成した招待コード</h2>
        {inviteCodes.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ招待コードはありません。まずは MYPACE-2026 を無制限で作成して、紹介ルートを用意してください。</p> : null}
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
        {reportError ? <p className="rounded-[1.15rem] bg-red-50 p-3 text-sm font-bold text-red-600">{reportError}</p> : null}
        {reportNotice ? <p className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold text-theme-main-dark">{reportNotice}</p> : null}
        {isSupabaseMode && isAuthenticated ? (
          <>
            {supabaseReports.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ通報はありません。プロフィールまたはDM画面の通報ボタンから reports テーブルへ保存されます。</p> : null}
            {supabaseReports.map((report) => {
              const isUpdatingStatus = updatingReportStatusId === report.id;
              const isSavingNote = savingReportNoteId === report.id;
              const noteDraft = reportNoteDrafts[report.id] ?? '';

              return (
                <div className="space-y-3 rounded-[1.25rem] bg-theme-accent-soft/45 p-3" key={report.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-theme-muted">通報された相手</p>
                      <p className="break-all font-black text-theme-main-dark">{report.reportedUser?.name ?? report.reported_user_id}</p>
                    </div>
                    <Badge className="bg-theme-background text-theme-main-dark">{getReportStatusLabel(report.status)}</Badge>
                  </div>

                  <div className="grid gap-2 rounded-[1rem] bg-white/55 p-3 text-xs font-bold leading-5 text-theme-muted">
                    <span className="break-words">通報者: {report.reporter?.name ?? report.reporter_id}</span>
                    <span className="break-words">理由: {report.reason}</span>
                    <span className="break-words">補足: {report.detail || '未入力'}</span>
                    <span>ステータス: {getReportStatusLabel(report.status)}（{report.status}）</span>
                    <span>通報日時: {formatDateTime(report.created_at)}</span>
                    <span>reviewed_at: {formatDateTime(report.reviewed_at, '未レビュー')}</span>
                    <span className="break-words">admin_note: {report.admin_note || '未入力'}</span>
                  </div>

                  <label className="grid gap-1.5 text-sm font-black text-theme-text">
                    ステータス変更
                    <select
                      className="min-h-11 w-full rounded-[1rem] border border-theme-main/15 bg-white px-3 text-sm font-bold text-theme-text outline-none transition focus:border-theme-main focus:ring-2 focus:ring-theme-main/20 disabled:opacity-60"
                      disabled={isUpdatingStatus || isSavingNote}
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
                        className="min-h-24 w-full resize-y rounded-[1rem] border border-theme-main/15 bg-white px-3 py-2 text-sm font-bold leading-6 text-theme-text outline-none transition placeholder:text-theme-muted/70 focus:border-theme-main focus:ring-2 focus:ring-theme-main/20 disabled:opacity-60"
                        disabled={isUpdatingStatus || isSavingNote}
                        onChange={(event) => updateReportNoteDraft(report.id, event.target.value)}
                        placeholder="対応方針や確認メモを、必要な範囲だけ残します。"
                        value={noteDraft}
                      />
                    </label>
                    <div className="flex justify-end">
                      <Button className="min-h-9 px-3 py-1.5" disabled={isUpdatingStatus || isSavingNote} onClick={() => handleSaveReportAdminNote(report)} type="button" variant="secondary">
                        {isSavingNote ? '保存中...' : 'メモを保存'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm font-bold leading-6 text-theme-muted">ローカルデモでは通報済みユーザーの仮表示を維持します。ステータス更新と管理メモ保存はSupabase接続時に管理できます。</p>
            {reportedUsers.length === 0 ? <p className="rounded-[1.15rem] bg-theme-background/70 p-3 text-sm leading-6 text-theme-muted">まだ通報はありません。プロフィールまたはDM画面の通報ボタンから反映されます。</p> : null}
            {reportedUsers.map((reportedUser) => (
              <div className="flex items-center gap-2.5 rounded-[1.15rem] bg-theme-accent-soft/45 p-2.5" key={reportedUser.id}>
                <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${reportedUser.gradient} font-black text-theme-main-dark`}>{reportedUser.name.slice(0, 1)}</span>
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
