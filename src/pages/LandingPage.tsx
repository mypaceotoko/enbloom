import { ArrowRight, Flower2, HeartHandshake, LockKeyhole, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function LandingPage() {
  return (
    <section className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center gap-2 text-theme-main-dark">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-theme-main text-white shadow-lg shadow-theme-main/25">
            <Flower2 size={22} />
          </span>
          <div>
            <p className="text-lg font-black leading-none">EnBloom</p>
            <p className="text-xs font-bold text-theme-muted">Invite-only matching</p>
          </div>
        </div>

        <div className="flower-gradient soft-shadow overflow-hidden rounded-[2rem] p-6">
          <div className="space-y-5 rounded-[1.5rem] bg-white/72 p-6 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-theme-main-dark">Gentle Trust</p>
            <h1 className="text-4xl font-black leading-tight text-theme-text">縁が、恋に咲く。</h1>
            <p className="text-base leading-7 text-theme-text">
              友達の紹介や信頼できるつながりから、恋や縁が花開くマッチングWebアプリ。
            </p>
            <Link to="/login">
              <Button className="w-full">
                招待コードで始める
                <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            { icon: UsersRound, title: '紹介・信頼ベース', body: '大量スワイプではなく、信頼できるつながりを起点に出会います。' },
            { icon: HeartHandshake, title: '今日のご縁', body: '少人数のおすすめで、一人ひとりと丁寧に向き合える体験を目指します。' },
            { icon: LockKeyhole, title: '招待制の安心感', body: 'フェーズ1ではUIのみ。認証・DB接続は次フェーズで実装します。' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card className="flex gap-4" key={item.title}>
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
