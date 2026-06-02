import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const tags = ['読書', '映画', '散歩', '料理', '花', 'カフェ', '旅行', '音楽'];

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <PageShell description="保存はまだ行わず、プロフィール作成の流れを確認するためのローカルUIです。" eyebrow="First Bloom" title="はじめてのプロフィール">
      <Card className="space-y-4">
        <Input label="表示名" name="displayName" placeholder="例：美桜" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="年齢" name="age" placeholder="30" type="number" />
          <Input label="地域" name="location" placeholder="東京都" />
        </div>
        <label className="block space-y-2 text-sm font-semibold text-theme-text">
          <span>出会いの温度感</span>
          <select className="min-h-12 w-full rounded-2xl border border-theme-main/20 bg-white/70 px-4 text-theme-text outline-none focus:border-theme-main focus:ring-4 focus:ring-theme-main/15">
            <option>ゆっくり会話から始めたい</option>
            <option>安心感があれば会ってみたい</option>
            <option>価値観が合えば前向きに進めたい</option>
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm font-semibold">趣味タグ</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
      </Card>
      <Card className="space-y-4">
        <div>
          <h2 className="font-black">テーマを選ぶ</h2>
          <p className="mt-1 text-sm leading-6 text-theme-muted">設定はlocalStorageに保存され、将来はuser_preferences.themeへ接続しやすい構造です。</p>
        </div>
        <ThemeSwitcher />
      </Card>
      <Button className="w-full" onClick={() => navigate('/home')}>今日のご縁へ</Button>
    </PageShell>
  );
}
