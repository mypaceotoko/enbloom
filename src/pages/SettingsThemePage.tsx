import { ArrowLeft, Palette } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useTheme, type ThemeDefinition } from '../context/ThemeProvider';

export function SettingsThemePage() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [notice, setNotice] = useState('');

  function handleThemeChange(theme: ThemeDefinition) {
    setNotice(`${theme.name}に変更しました。`);
  }

  return (
    <PageShell description="好きな色合いに切り替えて、ConnectBloomを自分らしく使えます。" eyebrow="Theme Color" title="テーマカラー">
      <Button className="w-fit px-3" onClick={() => navigate('/settings')} type="button" variant="secondary">
        <ArrowLeft size={16} />
        設定に戻る
      </Button>

      {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}

      <Card className="space-y-3 border-theme-main/15 bg-theme-card/86 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-main/10 text-theme-main-dark"><Palette size={18} /></span>
          <span>
            <span className="block text-sm font-black text-theme-text">現在のテーマ: {currentTheme.name}</span>
            <span className="mt-0.5 block text-xs leading-5 text-theme-muted">選択中のテーマは保存され、次回以降も反映されます。</span>
          </span>
        </div>
      </Card>

      <ThemeSwitcher collapseOnSelect={false} defaultExpanded onThemeChange={handleThemeChange} />
    </PageShell>
  );
}
