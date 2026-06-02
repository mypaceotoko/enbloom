import { ArrowRight, Flower2, HeartHandshake, LockKeyhole, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function LandingPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+2.75rem)] pt-6">
      <div className="pointer-events-none absolute -left-20 top-24 size-56 rounded-full bg-theme-accent-soft/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-8 size-52 rounded-full bg-theme-main/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 size-72 -translate-x-1/2 rounded-full bg-theme-main/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col gap-5">
        <header className="flex items-center justify-between rounded-full border border-white/60 bg-theme-card/72 px-4 py-3 shadow-lg shadow-theme-main/10 backdrop-blur">
          <BrandLogo variant="default" />
          <span className="rounded-full bg-theme-accent-soft px-3 py-1 text-[11px] font-black text-theme-main-dark">招待制</span>
        </header>

        <div className="flower-gradient soft-shadow relative overflow-hidden rounded-[2.25rem] p-1">
          <div className="absolute right-5 top-5 flex size-16 items-center justify-center rounded-full bg-white/35 text-white/90 backdrop-blur">
            <Flower2 size={30} />
          </div>
          <div className="space-y-5 rounded-[2rem] bg-theme-card/78 p-5 pt-7 backdrop-blur-md sm:p-6 sm:pt-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-theme-card/80 px-3 py-1 text-xs font-black text-theme-main-dark">
              <Sparkles size={14} />
              Invite-only / Trust-based Matching
            </div>
            <div className="space-y-4">
              <h1 className="text-[2.65rem] font-black leading-[1.07] tracking-[-0.055em] text-theme-text sm:text-5xl">縁が、<br />恋に咲く。</h1>
              <p className="text-base leading-8 text-theme-text">
                友達の紹介や信頼できるつながりから、恋や縁が花開くマッチングWebアプリ。
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.5rem] bg-theme-background/70 p-3 text-sm font-bold text-theme-text">
              <span className="flex items-center gap-2"><UsersRound className="text-theme-main-dark" size={17} />紹介から始まる安心感</span>
              <span className="flex items-center gap-2"><HeartHandshake className="text-theme-main-dark" size={17} />1日数人だけ、丁寧に向き合う</span>
              <span className="flex items-center gap-2"><LockKeyhole className="text-theme-main-dark" size={17} />大量スワイプではない出会い体験</span>
            </div>
            <div className="grid gap-2.5">
              <Link to="/home">
                <Button className="min-h-11 w-full rounded-[1.2rem] py-2.5">
                  デモで見る
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button className="min-h-11 w-full rounded-[1.2rem] bg-theme-accent py-2.5 text-white shadow-theme-accent/25 hover:bg-theme-accent/90" variant="secondary">
                  招待コードで始める
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            { icon: UsersRound, title: '紹介・信頼ベース', body: '知っている人のつながりを起点に、安心して出会いを育てます。' },
            { icon: HeartHandshake, title: '今日のご縁', body: 'おすすめは少人数。プロフィールを読み、温度感を確かめながら進めます。' },
            { icon: LockKeyhole, title: '安全な余白', body: 'Phase 1.5はUIデモ。認証・DB保存・永続化はまだ行いません。' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card className="flex gap-4 bg-theme-card/86 backdrop-blur" key={item.title}>
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
                  <Icon size={22} />
                </span>
                <span>
                  <span className="block font-black text-theme-text">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-theme-muted">{item.body}</span>
                </span>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
