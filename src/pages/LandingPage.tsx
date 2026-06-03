import { ArrowRight, Flower2, HeartHandshake, LockKeyhole, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function LandingPage() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-6">
      <div className="pointer-events-none absolute -left-20 top-24 size-56 rounded-full bg-theme-accent-soft/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-8 size-52 rounded-full bg-theme-main/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 size-72 -translate-x-1/2 rounded-full bg-theme-main/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <header className="flex items-center justify-between rounded-full border border-white/60 bg-theme-card/72 px-3.5 py-2.5 shadow-lg shadow-theme-main/10 backdrop-blur">
          <BrandLogo variant="default" />
          <span className="rounded-full bg-theme-accent-soft px-3 py-1 text-[11px] font-black text-theme-main-dark">招待制</span>
        </header>

        <div className="flower-gradient soft-shadow relative overflow-hidden rounded-[1.7rem] p-1">
          <div className="absolute right-4 top-4 flex size-14 items-center justify-center rounded-full bg-white/35 text-white/90 backdrop-blur">
            <Flower2 size={26} />
          </div>
          <div className="space-y-3 rounded-[1.45rem] bg-theme-card/78 p-4 pt-6 backdrop-blur-md sm:p-5 sm:pt-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-theme-card/80 px-2.5 py-0.5 text-[11px] font-black text-theme-main-dark">
              <Sparkles size={14} />
              Invite-only / Connect SNS
            </div>
            <div className="space-y-3">
              <h1 className="text-[2.65rem] font-black leading-[1.07] tracking-[-0.055em] text-theme-text sm:text-5xl">紹介から、<br />共創がひらく。</h1>
              <p className="text-[15px] leading-7 text-theme-text">
                信頼できる紹介や共通の興味から、一緒に作る・話す・出かける・学ぶ人とつながる紹介制コネクトSNS。
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.15rem] bg-theme-background/70 p-3 text-[13px] font-bold text-theme-text">
              <span className="flex items-center gap-2"><UsersRound className="text-theme-main-dark" size={17} />信頼できる紹介から、活動仲間とつながる</span>
              <span className="flex items-center gap-2"><HeartHandshake className="text-theme-main-dark" size={17} />共通の興味から、ゆっくり会話が始まる</span>
              <span className="flex items-center gap-2"><LockKeyhole className="text-theme-main-dark" size={17} />活動・共創を軸にしたつながり体験</span>
            </div>
            <div className="grid gap-2">
              <Link to="/home">
                <Button className="w-full">
                  デモで見る
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button className="w-full bg-theme-accent text-white shadow-theme-accent/25 hover:bg-theme-accent/90" variant="secondary">
                  招待コードで始める
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            { icon: UsersRound, title: '紹介・信頼ベース', body: '知っている人のつながりを起点に、活動・興味・紹介のご縁を安心して育てます。' },
            { icon: HeartHandshake, title: '今日のつながり', body: 'おすすめは少人数。活動ジャンルや話したいテーマを見ながら進めます。' },
            { icon: LockKeyhole, title: '安心できる余白', body: 'ConnectBloomは、紹介制のコネクトSNSです。性別で相手を探す設計には寄せません。' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card className="flex gap-3 bg-theme-card/86 py-3.5 backdrop-blur" key={item.title}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block font-black text-theme-text">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-theme-muted">{item.body}</span>
                </span>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
