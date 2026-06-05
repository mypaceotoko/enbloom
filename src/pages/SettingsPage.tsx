import type { ReactNode } from 'react';
import { ArrowRight, Bell, ClipboardCheck, ClipboardList, DoorOpen, FileText, Flag, HeartHandshake, Languages, LockKeyhole, LogOut, MessageCircle, Palette, ShieldCheck, ShieldMinus, Sparkles, Ticket, UserRound, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { SETTINGS_SCROLL_STORAGE_KEY } from '../components/BackToSettingsLink';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../hooks/useAppState';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import type { TranslationKey } from '../lib/i18n';
import { LANGUAGE_LABELS, type AppLanguage } from '../lib/language';
import { safeGetUnreadNotificationCount } from '../lib/notificationApi';

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { resetDemoState } = useAppState();
  const { isAuthenticated, isSupabaseMode, signOut } = useAuth();
  const { isFounder } = useAdmin();
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
        <SettingsLink body={t('settings.theme.body')} icon={<Palette size={18} />} onClick={() => navigateFromSettings('/settings/theme')} title={t('settings.theme.title')} />
        <LanguageSettingCard currentLanguage={language} onChange={handleLanguageChange} t={t} />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.activity.eyebrow')}</p>
          <h2 className="text-lg font-black text-theme-text">{t('settings.activity.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.activity.description')}</p>
        </div>
        <SettingsLink badge={unreadNotificationCount > 0 ? t('settings.notifications.unreadBadge').replace('{count}', String(unreadNotificationCount)) : t('settings.notifications.noNotifications')} badgeVariant={unreadNotificationCount > 0 ? 'unread' : 'empty'} body={t('settings.notifications.body')} icon={<Bell size={18} />} onClick={() => navigateFromSettings('/notifications')} title={t('settings.notifications.title')} />
        <SettingsLink body={t('settings.myActivity.body')} icon={<Sparkles size={18} />} onClick={() => navigateFromSettings('/my-activity')} title={t('settings.myActivity.title')} />
        <SettingsLink body={t('settings.myPosts.body')} icon={<ClipboardList size={18} />} onClick={() => navigateFromSettings('/my-board')} title={t('settings.myPosts.title')} />
        <SettingsLink body={t('settings.myInterests.body')} icon={<HeartHandshake size={18} />} onClick={() => navigateFromSettings('/my-interests')} title={t('settings.myInterests.title')} />
        <SettingsLink body={t('settings.connections.body')} icon={<MessageCircle size={18} />} onClick={() => navigateFromSettings('/matches')} title={t('settings.connections.title')} />
        <SettingsLink body={t('settings.rooms.body')} icon={<DoorOpen size={18} />} onClick={() => navigateFromSettings('/rooms')} title={t('settings.rooms.title')} />
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.safetyOperations.eyebrow')}</p>
          <h2 className="text-lg font-black text-theme-text">{t('settings.safetyOperations.title')}</h2>
          <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.safetyOperations.description')}</p>
        </div>
        <SettingsLink body={t('settings.safety.body')} icon={<ShieldCheck size={18} />} onClick={() => navigateFromSettings('/safety')} title={t('settings.safety.title')} />
        <SettingsLink body={t('settings.blockedUsers.body')} icon={<ShieldMinus size={18} />} onClick={() => navigateFromSettings('/blocked-users')} title={t('settings.blockedUsers.title')} />
        <SettingsLink body={t('settings.inviteSlots.body')} icon={<Ticket size={18} />} onClick={() => navigateFromSettings('/invite-codes')} title={t('settings.inviteSlots.title')} />
      </section>

      {isFounder ? (
        <section className="space-y-3">
          <div className="px-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('settings.adminMenu.eyebrow')}</p>
            <h2 className="text-lg font-black text-theme-text">{t('settings.adminMenu.title')}</h2>
            <p className="mt-1 text-xs leading-5 text-theme-muted">{t('settings.adminMenu.description')}</p>
          </div>
          <SettingsLink body={t('settings.inviteCodes.body')} icon={<Ticket size={18} />} onClick={() => navigateFromSettings('/admin')} title={t('settings.inviteCodes.title')} />
          <SettingsLink body={t('settings.reports.body')} icon={<Flag size={18} />} onClick={() => navigateFromSettings('/admin')} title={t('settings.reports.title')} />
        </section>
      ) : null}

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
    <Card className="space-y-2.5 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
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
      <div className="inline-flex w-fit rounded-full bg-white/70 p-1 ring-1 ring-theme-sky/25 shadow-sm">
        {languages.map((language) => {
          const selected = language === currentLanguage;
          return (
            <button
              aria-pressed={selected}
              className={`inline-flex min-h-9 items-center justify-center rounded-full px-4 text-sm font-black transition active:scale-[0.98] ${
                selected
                  ? 'bg-gradient-to-r from-theme-yellow/90 via-theme-cyan/60 to-theme-sky/75 text-slate-900 shadow-sm ring-1 ring-white/70'
                  : 'bg-white/60 text-slate-500 hover:bg-white hover:text-theme-main-dark'
              }`}
              key={language}
              onClick={() => onChange(language)}
              type="button"
            >
              {t(language === 'ja' ? 'settings.language.ja' : 'settings.language.en')}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SettingsLink({ badge, badgeVariant = 'empty', body, icon, onClick, title }: { badge?: string; badgeVariant?: 'empty' | 'unread'; body: string; icon: ReactNode; onClick: () => void; title: string }) {
  return (
    <button className="w-full text-left transition active:scale-[0.99]" onClick={onClick} type="button">
      <Card className="space-y-2 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-main/10 text-theme-main-dark">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-black text-theme-text">
              {title}
              {badge ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${badgeVariant === 'unread' ? 'bg-theme-main text-white' : 'bg-theme-accent-soft text-theme-main-dark'}`}>{badge}</span> : null}
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
