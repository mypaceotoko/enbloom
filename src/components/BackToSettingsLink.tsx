import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const SETTINGS_SCROLL_STORAGE_KEY = 'connectbloom.settingsScrollY';

type SettingsReturnState = {
  fromSettings?: boolean;
  settingsScrollY?: number;
};

function getSettingsReturnState(state: unknown): SettingsReturnState {
  if (!state || typeof state !== 'object') return {};
  return state as SettingsReturnState;
}

export function BackToSettingsLink() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fromSettings, settingsScrollY } = getSettingsReturnState(location.state);

  if (!fromSettings || location.pathname === '/settings') return null;

  function handleClick() {
    if (typeof settingsScrollY === 'number' && Number.isFinite(settingsScrollY)) {
      sessionStorage.setItem(SETTINGS_SCROLL_STORAGE_KEY, String(settingsScrollY));
    }

    navigate('/settings', { state: { restoreSettingsScroll: true } });
  }

  return (
    <button
      className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-full border border-theme-main/15 bg-theme-card/86 px-3 py-1.5 text-sm font-black text-theme-main-dark shadow-sm transition hover:bg-theme-accent-soft/70 active:scale-[0.98]"
      onClick={handleClick}
      type="button"
    >
      <ArrowLeft size={16} />
      設定に戻る
    </button>
  );
}
