import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, Moon, Palette } from 'lucide-react';
import { useTheme, type ThemeDefinition, type ThemeId } from '../context/ThemeProvider';
import { cn } from '../lib/utils';

export function ThemeSwitcher() {
  const { themeId, currentTheme, setThemeId, themes } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const chooseTheme = (nextThemeId: ThemeId) => {
    setThemeId(nextThemeId);
    setExpanded(false);
  };

  return (
    <div className="space-y-2.5">
      <button
        aria-expanded={expanded}
        className="w-full rounded-[1.15rem] border border-theme-sky/25 bg-theme-card p-3.5 text-left shadow-sm shadow-theme-sky/10 transition active:scale-[0.99]"
        onClick={() => setExpanded((isExpanded) => !isExpanded)}
        type="button"
      >
        <ThemeCardContent
          selected
          theme={currentTheme}
          trailing={(
            <span className="flex shrink-0 items-center gap-2 rounded-full border border-theme-sky/25 bg-theme-background/70 px-2.5 py-1.5 text-[11px] font-black text-theme-main-dark">
              変更
              <ChevronDown className={cn('transition', expanded ? 'rotate-180' : '')} size={14} />
            </span>
          )}
        />
      </button>

      {expanded ? (
        <div className="grid gap-2.5">
          {themes.map((theme) => {
            const selected = themeId === theme.id;

            return (
              <button
                className={cn(
                  'w-full rounded-[1.15rem] border bg-theme-card p-3.5 text-left transition active:scale-[0.99]',
                  selected ? 'border-theme-sky shadow-lg shadow-theme-sky/15 ring-2 ring-theme-sky/15' : 'border-theme-sky/25 hover:border-theme-sky/45',
                )}
                key={theme.id}
                onClick={() => chooseTheme(theme.id)}
                type="button"
              >
                <ThemeCardContent selected={selected} theme={theme} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type ThemeCardContentProps = {
  selected: boolean;
  theme: ThemeDefinition;
  trailing?: ReactNode;
};

function ThemeCardContent({ selected, theme, trailing }: ThemeCardContentProps) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-theme-sky/20" style={{ backgroundColor: theme.colors.background }}>
        <span className="absolute -left-2 top-1 size-7 rounded-full" style={{ backgroundColor: theme.colors.accentSoft }} />
        <span className="absolute right-1 top-2 size-6 rounded-full" style={{ backgroundColor: theme.colors.main }} />
        <span className="absolute bottom-1 left-3.5 size-4 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
        {theme.id === 'night' ? <Moon className="relative text-white" size={16} /> : <Palette className="relative text-white drop-shadow" size={16} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block text-[13px] font-black text-theme-text">{theme.name}</span>
          {selected ? <span className="rounded-full bg-theme-yellow/80 px-2 py-0.5 text-[9.5px] font-black text-theme-main-dark">選択中</span> : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-theme-muted">{theme.description}</span>
        <span className="mt-2 flex gap-1.5">
          {[theme.colors.main, theme.colors.mainDark, theme.colors.accent, theme.colors.accentSoft, theme.colors.background].map((color) => (
            <span className="size-4 rounded-full border border-theme-sky/20" key={color} style={{ backgroundColor: color }} />
          ))}
        </span>
      </span>
      {trailing ?? (
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full border', selected ? 'border-theme-sky bg-theme-yellow/80 text-theme-main-dark' : 'border-theme-sky/25 text-transparent')}>
          <Check size={16} />
        </span>
      )}
    </span>
  );
}
