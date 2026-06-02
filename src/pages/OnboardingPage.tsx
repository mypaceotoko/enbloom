import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Flower2, MapPin, Palette, Tags, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const tags = ['読書', '映画', '散歩', '料理', '花', 'カフェ', '旅行', '音楽'];
const steps = ['基本情報', '温度感', 'テーマ'];

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <PageShell description="保存はまだ行わず、プロフィール作成の流れを確認するためのローカルUIです。" eyebrow="First Bloom" title="はじめてのプロフィール">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.6rem] bg-theme-card/78 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-theme-main-dark"><Flower2 size={18} />3ステップで、あなたらしい出会いの準備</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {steps.map((step, index) => (
              <div className="rounded-2xl bg-theme-card/80 p-3 text-center" key={step}>
                <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-theme-main text-xs font-black text-white">{index + 1}</span>
                <p className="mt-2 text-[11px] font-black text-theme-text">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <SectionTitle icon={<UserRound size={18} />} label="Step 1" title="基本情報" />
        <Input label="表示名" name="displayName" placeholder="例：美桜" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="年齢" name="age" placeholder="30" type="number" />
          <Input label="地域" name="location" placeholder="東京都" />
        </div>
        <Input label="職業・雰囲気" name="occupation" placeholder="例：編集者 / カフェ巡りが好き" />
      </Card>

      <Card className="space-y-5">
        <SectionTitle icon={<MapPin size={18} />} label="Step 2" title="出会いの温度感" />
        <label className="block space-y-2 text-sm font-semibold text-theme-text">
          <span>今の気持ちに近いもの</span>
          <select className="min-h-12 w-full rounded-2xl border border-theme-main/20 bg-theme-card px-4 text-theme-text outline-none focus:border-theme-main focus:ring-4 focus:ring-theme-main/15">
            <option>ゆっくり会話から始めたい</option>
            <option>安心感があれば会ってみたい</option>
            <option>価値観が合えば前向きに進めたい</option>
          </select>
        </label>
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-black"><Tags size={16} />趣味タグ</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge className="cursor-default bg-theme-background/80 px-4 py-2" key={tag}>{tag}</Badge>
            ))}
          </div>
          <p className="text-xs leading-5 text-theme-muted">Phase 1.5では選択状態の保存はせず、UIの見え方を確認します。</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionTitle icon={<Palette size={18} />} label="Step 3" title="テーマを選ぶ" />
        <p className="text-sm leading-6 text-theme-muted">設定はlocalStorageに保存され、将来はuser_preferences.themeへ接続しやすい構造です。</p>
        <ThemeSwitcher />
      </Card>

      <div className="sticky bottom-24 z-10 rounded-[1.75rem] border border-white/60 bg-theme-card/90 p-3 shadow-2xl shadow-theme-main/15 backdrop-blur">
        <Button className="w-full" onClick={() => navigate('/home')}>
          <CheckCircle2 size={18} />
          今日のご縁へ進む
          <ArrowRight size={18} />
        </Button>
      </div>
    </PageShell>
  );
}

function SectionTitle({ icon, label, title }: { icon: ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{label}</p>
        <h2 className="font-black text-theme-text">{title}</h2>
      </div>
    </div>
  );
}
