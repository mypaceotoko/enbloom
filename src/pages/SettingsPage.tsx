import type { ReactNode } from 'react';
import { ArrowRight, Bell, ClipboardCheck, ClipboardList, DoorOpen, FileText, Flag, HeartHandshake, Languages, LockKeyhole, LogOut, MessageCircle, Palette, ShieldCheck, ShieldMinus, Sparkles, Ticket, UserRound, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SETTINGS_SCROLL_STORAGE_KEY } from '../components/BackToSettingsLink';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../lib/i18n';
import { LANGUAGE_LABELS, type AppLanguage } from '../lib/language';
import { safeGetUnreadNotificationCount } from '../lib/notificationApi';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { resetDemoState } = useAppState();
  const { isAuthenticated, isSupabaseMode, signOut } = useAuth();
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'success' | 'error'>('success');
  const [signingOut, setSigningOut] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUnreadNotificationCount() {
      if (!isSupabaseMode || !isAuthenticated) {
        setUnreadNotificationCount(0);
        return;
      }

      const count = await safeGetUnreadNotificationCount();
      if (mounted) setUnreadNotificationCount(count);
    }

    void loadUnreadNotificationCount();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode]);

  useEffect(() => {
    const state = location.state as { restoreSettingsScroll?: boolean } | null;
    if (!state?.restoreSettingsScroll) return;

    const savedValue = sessionStorage.getItem(SETTINGS_SCROLL_STORAGE_KEY);
    if (savedValue === null) return;

    const savedScrollY = Number(savedValue);
    if (!Number.isFinite(savedScrollY)) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
        sessionStorage.removeItem(SETTINGS_SCROLL_STORAGE_KEY);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [location.state]);

  function navigateFromSettings(path: string) {
    const settingsScrollY = window.scrollY;
    sessionStorage.setItem(SETTINGS_SCROLL_STORAGE_KEY, String(settingsScrollY));
    navigate(path, { state: { fromSettings: true, settingsScrollY } });
  }

  async function handleSignOut() {
    const confirmed = window.confirm(t('settings.logout.confirm'));
    if (!confirmed) return;

    setSigningOut(true);
    setNotice('');

    try {
      if (isSupabaseMode && isAuthenticated) {
        await signOut();
      } else {
        resetDemoState();
      }
      navigate('/login');
    } catch (caughtError) {
      setNoticeKind('error');
      setNotice(caughtError instanceof Error ? `${t('settings.logout.failed')}: ${caughtError.message}` : t('settings.logout.failed'));
    } finally {
      setSigningOut(false);
    }
  }

  function handleLanguageChange(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    setNoticeKind('success');
    setNotice(t(nextLanguage === 'ja' ? 'settings.language.changed.ja' : 'settings.language.changed.en'));
  }

  return (
    <PageShell description={t('settings.description')} eyebrow="Settings" title={t('settings.title')}>
      {!isSupabaseMode || !isAuthenticated ? (
        <div className="rounded-full border border-theme-main/15 bg-theme-card/80 px-3 py-1.5 text-center text-[11px] font-black text-theme-main-dark shadow-sm">
          {t('settings.demo')}
        </div>
      ) : null}

      {notice ? (
        <div className={`rounded-[1.15rem] p-3 text-sm font-bold ${noticeKind === 'error' ? 'bg-red-50 text-red-600' : 'bg-theme-accent-soft/70 text-theme-main-dark'}`}>
          {notice}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.basic.eyebrow')}</p>
          <h2 className="text-lg font-black text-theme-text">{t('settings.basic.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.basic.description')}</p>
        </div>
        <SettingsLink body={t('settings.profile.body')} icon={<UserRound size={18} />} onClick={() => navigateFromSettings('/my-profile')} title={t('settings.profile.title')} />
        <SettingsLink body={`${t('settings.theme.current')}: ${currentTheme.name}`} icon={<Palette size={18} />} onClick={() => navigateFromSettings('/settings/theme')} title={t('settings.theme.title')} />
        <LanguageSettingCard currentLanguage={language} onChange={handleLanguageChange} t={t} />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Activity management</p>
          <h2 className="text-lg font-black text-theme-text">活動管理</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">募集・参加希望・通知・会話をまとめて確認できます。</p>
        </div>
        <SettingsLink badge={unreadNotificationCount > 0 ? `未読 ${unreadNotificationCount}件` : '通知はありません'} body="参加希望・承認・メッセージを確認できます。" icon={<Bell size={18} />} onClick={() => navigateFromSettings('/notifications')} title="通知" />
        <SettingsLink body="募集・参加希望・通知・会話への導線を1か所で確認できます。" icon={<Sparkles size={18} />} onClick={() => navigateFromSettings('/my-activity')} title="マイアクティビティ" />
        <SettingsLink body="投稿した募集と届いた参加希望を管理できます。" icon={<ClipboardList size={18} />} onClick={() => navigateFromSettings('/my-board')} title="自分の募集" />
        <SettingsLink body="自分が送った参加希望の状態を確認・取り消しできます。" icon={<HeartHandshake size={18} />} onClick={() => navigateFromSettings('/my-interests')} title="参加希望した募集" />
        <SettingsLink body="承認後につながったコネクトとDMを確認できます。" icon={<MessageCircle size={18} />} onClick={() => navigateFromSettings('/matches')} title="コネクト一覧" />
        <SettingsLink body="参加中のルームと会話を確認できます。" icon={<DoorOpen size={18} />} onClick={() => navigateFromSettings('/rooms')} title="ルーム" />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Safety & operations</p>
          <h2 className="text-lg font-black text-theme-text">安心・運営</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">安心して使うためのガイドや管理機能を確認できます。</p>
        </div>
        <SettingsLink body={t('settings.safety.body')} icon={<ShieldCheck size={18} />} onClick={() => navigateFromSettings('/safety')} title={t('settings.safety.title')} />
        <SettingsLink body="ブロックした相手の確認・解除ができます。" icon={<ShieldMinus size={18} />} onClick={() => navigateFromSettings('/blocked-users')} title="ブロック中のユーザー" />
        <SettingsLink body="βテスター向けの招待コードを作成・確認できます。" icon={<Ticket size={18} />} onClick={() => navigateFromSettings('/admin')} title="招待コード管理" />
        <SettingsLink body="届いた通報の確認・対応を管理画面で行えます。" icon={<Flag size={18} />} onClick={() => navigateFromSettings('/admin')} title="通報管理" />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.guide.eyebrow')}</p>
          <h2 className="text-lg font-black text-theme-text">{t('settings.guide.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.guide.description')}</p>
        </div>
        <SettingsLink body={t('settings.testGuide.body')} icon={<ClipboardCheck size={18} />} onClick={() => navigateFromSettings('/test-guide')} title={t('settings.testGuide.title')} />
        <SettingsLink body={t('settings.terms.body')} icon={<FileText size={18} />} onClick={() => navigateFromSettings('/terms')} title={t('settings.terms.title')} />
        <SettingsLink body={t('settings.privacy.body')} icon={<LockKeyhole size={18} />} onClick={() => navigateFromSettings('/privacy')} title={t('settings.privacy.title')} />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.comingSoon.eyebrow')}</p>
          <h2 className="text-lg font-black text-theme-text">{t('settings.comingSoon.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.comingSoon.description')}</p>
        </div>
        <Placeholder icon={<UserRoundCheck size={18} />} title={t('settings.referrer.title')} body={t('settings.referrer.body')} />
        <Placeholder icon={<ShieldCheck size={18} />} title={t('settings.support.title')} body={t('settings.support.body')} />
      </section>

      <Card className="space-y-3 border-white/40 bg-theme-card/72 py-3 shadow-sm">
        <div className="flex gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft/60 text-theme-main-dark"><LogOut size={18} /></span>
          <span>
            <span className="block text-sm font-black">{t('settings.logout.title')}</span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{t('settings.logout.body')}</span>
          </span>
        </div>
        <Button className="w-full bg-theme-card/90 hover:bg-theme-accent-soft/70" disabled={signingOut} onClick={handleSignOut} variant="secondary">
          {signingOut ? t('settings.logout.signingOut') : t('settings.logout.button')}
        </Button>
      </Card>

    </PageShell>
  );
}


function LanguageSettingCard({ currentLanguage, onChange, t }: { currentLanguage: AppLanguage; onChange: (language: AppLanguage) => void; t: (key: TranslationKey) => string }) {
  const languages: AppLanguage[] = ['ja', 'en'];

  return (
    <Card className="space-y-3 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-main/10 text-theme-main-dark"><Languages size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-theme-text">{t('settings.language.title')}</span>
          <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{t('settings.language.description')}</span>
          <span className="mt-1 block text-xs font-bold text-theme-main-dark">
            {t('settings.language.current')}: {LANGUAGE_LABELS[currentLanguage]}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {languages.map((language) => {
          const selected = language === currentLanguage;
          return (
            <Button
              aria-pressed={selected}
              className={selected ? 'min-h-10 bg-theme-main text-white hover:bg-theme-main' : 'min-h-10 bg-theme-card/90'}
              key={language}
              onClick={() => onChange(language)}
              variant={selected ? 'primary' : 'secondary'}
            >
              {t(language === 'ja' ? 'settings.language.ja' : 'settings.language.en')}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

function SettingsLink({ badge, body, icon, onClick, title }: { badge?: string; body: string; icon: ReactNode; onClick: () => void; title: string }) {
  return (
    <button className="w-full text-left transition active:scale-[0.99]" onClick={onClick} type="button">
      <Card className="space-y-2 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-main/10 text-theme-main-dark">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-black text-theme-text">
              {title}
              {badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badge.startsWith('未読') ? 'bg-theme-main text-white' : 'bg-theme-accent-soft text-theme-main-dark'}`}>{badge}</span> : null}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{body}</span>
          </span>
          <ArrowRight className="shrink-0 text-theme-main-dark" size={18} />
        </div>
      </Card>
    </button>
  );
}

function Placeholder({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="flex gap-2.5 bg-theme-card/86 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">{icon}</span>
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{body}</span>
      </span>
    </Card>
  );
}
