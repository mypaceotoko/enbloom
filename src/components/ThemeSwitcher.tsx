import { Check } from 'lucide-react';
import { useTheme, type ThemeId } from '../context/ThemeProvider';
import { cn } from '../lib/utils';

export function ThemeSwitcher() {
  const { themeId, setThemeId, themes } = useTheme();

  return (
    <div className="space-y-3">
      {themes.map((theme) => (
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-3xl border bg-theme-card p-4 text-left transition active:scale-[0.99]',
            themeId === theme.id ? 'border-theme-main ring-4 ring-theme-main/10' : 'border-theme-main/10',
          )}
          key={theme.id}
          onClick={() => setThemeId(theme.id as ThemeId)}
          type="button"
        >
          <span className="flex -space-x-2">
            <span className="size-8 rounded-full border-2 border-white" style={{ backgroundColor: theme.colors.main }} />
            <span className="size-8 rounded-full border-2 border-white" style={{ backgroundColor: theme.colors.accent }} />
            <span className="size-8 rounded-full border-2 border-white" style={{ backgroundColor: theme.colors.background }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-theme-text">{theme.name}</span>
            <span className="block text-xs leading-5 text-theme-muted">{theme.description}</span>
          </span>
          {themeId === theme.id ? <Check className="text-theme-main-dark" size={20} /> : null}
        </button>
      ))}
    </div>
  );
}
