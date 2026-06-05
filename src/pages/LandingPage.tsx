import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Flower2,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useLanguage } from '../hooks/useLanguage';
import { enableDemoMode } from '../lib/demoSession';

const aboutCards = [
  { icon: Compass, titleKey: 'landing.about.card1.title', bodyKey: 'landing.about.card1.body' },
  { icon: Blocks, titleKey: 'landing.about.card2.title', bodyKey: 'landing.about.card2.body' },
  { icon: HeartHandshake, titleKey: 'landing.about.card3.title', bodyKey: 'landing.about.card3.body' },
] as const;

const featureCards = [
  { icon: UsersRound, titleKey: 'landing.features.find.title', bodyKey: 'landing.features.find.body' },
  { icon: ClipboardCheck, titleKey: 'landing.features.post.title', bodyKey: 'landing.features.post.body' },
  { icon: MessagesSquare, titleKey: 'landing.features.room.title', bodyKey: 'landing.features.room.body' },
  { icon: UserCheck, titleKey: 'landing.features.dm.title', bodyKey: 'landing.features.dm.body' },
] as const;

const fitKeys = [
  'landing.fit.item1',
  'landing.fit.item2',
  'landing.fit.item3',
  'landing.fit.item4',
  'landing.fit.item5',
] as const;

const heroPreviewCards = [
  { titleKey: 'landing.point1', bodyKey: 'landing.heroPreview.item1' },
  { titleKey: 'landing.point2', bodyKey: 'landing.heroPreview.item2' },
  { titleKey: 'landing.point3', bodyKey: 'landing.heroPreview.item3' },
] as const;

const safetyCards = [
  { icon: LockKeyhole, titleKey: 'landing.safety.block.title', bodyKey: 'landing.safety.block.body' },
  { icon: ShieldCheck, titleKey: 'landing.safety.report.title', bodyKey: 'landing.safety.report.body' },
  { icon: MessageCircle, titleKey: 'landing.safety.policy.title', bodyKey: 'landing.safety.policy.body' },
] as const;

type LandingSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

function LandingSection({ eyebrow, title, description, children }: LandingSectionProps) {
  return (
    <section className="scroll-mt-8 space-y-4">
      <div className="space-y-2">
        {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-theme-main-dark">{eyebrow}</p>}
        <h2 className="text-2xl font-black tracking-[-0.04em] text-theme-text sm:text-3xl">{title}</h2>
        {description && <p className="text-[15px] leading-7 text-theme-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CtaButtons() {
  const { t } = useLanguage();

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link className="min-w-0" to="/login">
        <Button className="min-h-12 w-full text-sm">
          {t('landing.start')}
          <ArrowRight size={18} />
        </Button>
      </Link>
      <Link className="min-w-0" onClick={enableDemoMode} to="/home">
        <Button className="min-h-12 w-full bg-theme-card/90 text-theme-main-dark ring-1 ring-theme-sky/20" variant="ghost">
          {t('landing.demo')}
        </Button>
      </Link>
    </div>
  );
}

export function LandingPage() {
  const { t } = useLanguage();

  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-5 text-theme-text sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-24 size-64 rounded-full bg-theme-accent-soft/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-4 size-64 rounded-full bg-theme-sky/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/2 size-80 -translate-x-1/2 rounded-full bg-theme-cyan/10 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10">
        <section className="grid min-h-[calc(100vh-2rem)] content-center gap-4 py-2 sm:gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-center">
          <div className="space-y-4">
            <header className="relative left-1/2 flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center gap-1 rounded-full border border-white/60 bg-theme-card/75 px-1.5 py-2 shadow-lg shadow-theme-sky/10 backdrop-blur sm:left-auto sm:w-fit sm:max-w-xl sm:translate-x-0 sm:gap-1.5 sm:px-2.5 sm:py-2.5">
              <BrandLogo
                className="min-w-0 flex-[1_1_15.25rem] justify-start sm:max-w-[430px] sm:flex-[0_1_430px]"
                imageClassName="max-h-[4.65rem] w-full sm:max-h-[5.35rem]"
                variant="default"
              />
              <span className="mr-0.5 shrink-0 rounded-full bg-theme-accent-soft px-1.5 py-0.5 text-[8px] font-black text-theme-main-dark sm:mr-1 sm:px-2.5 sm:py-1 sm:text-[10px]">
                {t('landing.inviteOnly')}
              </span>
            </header>

            <div className="flower-gradient soft-shadow relative overflow-hidden rounded-[1.8rem] p-1">
              <div className="absolute right-4 top-4 flex size-14 items-center justify-center rounded-full bg-white/35 text-white/90 backdrop-blur">
                <Flower2 size={26} />
              </div>
              <div className="space-y-4 rounded-[1.55rem] bg-theme-card/82 p-4 pt-6 backdrop-blur-md sm:p-6 sm:pt-8">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-theme-card/85 px-3 py-1 text-[11px] font-black text-theme-main-dark">
                  <Sparkles size={14} />
                  <span className="truncate">{t('landing.heroLabel')}</span>
                </div>
                <div className="space-y-3">
                  <h1 className="break-words text-[2.55rem] font-black leading-[1.06] tracking-[-0.06em] text-theme-text sm:text-6xl">
                    {t('landing.title').split('\n').map((line) => <span className="block" key={line}>{line}</span>)}
                  </h1>
                  <p className="text-base font-black leading-7 text-theme-main-dark sm:text-lg">{t('landing.subtitle')}</p>
                  <p className="text-[15px] leading-7 text-theme-text sm:text-base">{t('landing.body')}</p>
                </div>
                <CtaButtons />
              </div>
            </div>
          </div>

          <Card className="grid gap-3 bg-theme-card/82 p-4 backdrop-blur lg:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-theme-main-dark">{t('landing.heroPreview.eyebrow')}</p>
            {heroPreviewCards.map((item) => (
              <div className="rounded-2xl bg-theme-background/70 p-3" key={item.titleKey}>
                <p className="font-black text-theme-text">{t(item.titleKey)}</p>
                <p className="mt-1 text-[13px] leading-5 text-theme-muted">{t(item.bodyKey)}</p>
              </div>
            ))}
          </Card>
        </section>

        <LandingSection description={t('landing.about.description')} eyebrow="ABOUT" title={t('landing.about.title')}>
          <div className="grid gap-3 sm:grid-cols-3">
            {aboutCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card className="bg-theme-card/88" key={item.titleKey}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 font-black text-theme-text">{t(item.titleKey)}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-theme-muted">{t(item.bodyKey)}</p>
                </Card>
              );
            })}
          </div>
        </LandingSection>

        <LandingSection description={t('landing.features.description')} eyebrow="FEATURES" title={t('landing.features.title')}>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card className="flex gap-3 bg-theme-card/88" key={item.titleKey}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
                    <Icon size={19} />
                  </span>
                  <span>
                    <span className="block font-black text-theme-text">{t(item.titleKey)}</span>
                    <span className="mt-1 block text-[13px] leading-6 text-theme-muted">{t(item.bodyKey)}</span>
                  </span>
                </Card>
              );
            })}
          </div>
        </LandingSection>

        <LandingSection description={t('landing.fit.description')} eyebrow="FOR YOU" title={t('landing.fit.title')}>
          <Card className="bg-theme-card/88">
            <div className="grid gap-2 sm:grid-cols-2">
              {fitKeys.map((key) => (
                <div className="flex gap-2 rounded-2xl bg-theme-background/70 p-3 text-[13px] font-bold leading-5 text-theme-text" key={key}>
                  <CheckCircle2 className="mt-0.5 shrink-0 text-theme-main-dark" size={17} />
                  <span>{t(key)}</span>
                </div>
              ))}
            </div>
          </Card>
        </LandingSection>

        <LandingSection description={t('landing.inviteReason.description')} eyebrow="INVITE" title={t('landing.inviteReason.title')}>
          <Card className="grid gap-3 bg-theme-card/88 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
              <Ticket size={22} />
            </span>
            <div className="space-y-2 text-[14px] leading-7 text-theme-muted">
              <p>{t('landing.inviteReason.body1')}</p>
              <p>{t('landing.inviteReason.body2')}</p>
              <p className="font-bold text-theme-text">{t('landing.inviteReason.body3')}</p>
            </div>
          </Card>
        </LandingSection>

        <LandingSection description={t('landing.safety.description')} eyebrow="SAFETY" title={t('landing.safety.title')}>
          <div className="grid gap-3 sm:grid-cols-3">
            {safetyCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card className="bg-theme-card/88" key={item.titleKey}>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 font-black text-theme-text">{t(item.titleKey)}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-theme-muted">{t(item.bodyKey)}</p>
                </Card>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-full bg-theme-card/90 px-4 py-2 text-[13px] font-black text-theme-main-dark ring-1 ring-theme-sky/20" to="/safety">{t('landing.safety.linkGuide')}</Link>
            <Link className="rounded-full bg-theme-card/90 px-4 py-2 text-[13px] font-black text-theme-main-dark ring-1 ring-theme-sky/20" to="/terms">{t('landing.safety.linkTerms')}</Link>
            <Link className="rounded-full bg-theme-card/90 px-4 py-2 text-[13px] font-black text-theme-main-dark ring-1 ring-theme-sky/20" to="/privacy">{t('landing.safety.linkPrivacy')}</Link>
          </div>
        </LandingSection>

        <LandingSection description={t('landing.beta.description')} eyebrow="BETA" title={t('landing.beta.title')}>
          <Card className="bg-theme-card/88">
            <p className="text-[14px] leading-7 text-theme-muted">{t('landing.beta.body')}</p>
            <Link className="mt-4 inline-flex rounded-full bg-theme-accent-soft px-4 py-2 text-[13px] font-black text-theme-main-dark" to="/test-guide">{t('landing.beta.link')}</Link>
          </Card>
        </LandingSection>

        <section className="flower-gradient soft-shadow mb-2 overflow-hidden rounded-[1.8rem] p-1">
          <div className="rounded-[1.55rem] bg-theme-card/84 p-5 text-center backdrop-blur-md sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-theme-main-dark">ConnectBloom</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-theme-text sm:text-4xl">{t('landing.final.title')}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-theme-muted">{t('landing.final.body')}</p>
            <div className="mx-auto mt-5 max-w-xl">
              <CtaButtons />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
