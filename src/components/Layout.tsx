import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const noChromePaths = ['/', '/login', '/auth/callback'];

export function Layout() {
  const { pathname } = useLocation();
  const showChrome = !noChromePaths.includes(pathname);
  const { isAuthenticated, isSupabaseMode } = useAuth();
  const showDemoBadge = showChrome && (!isSupabaseMode || !isAuthenticated);

  return (
    <div className="min-h-screen text-theme-text">
      {showChrome ? <Header /> : null}
      {showDemoBadge ? (
        <div className="pointer-events-none fixed right-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-40 rounded-full border border-theme-sky/25 bg-theme-card/85 px-2.5 py-1 text-[10px] font-black text-theme-main-dark shadow-sm backdrop-blur">
          ローカルデモ
        </div>
      ) : null}
      <main className={cn('mx-auto min-h-screen max-w-md', !showChrome && 'pb-[calc(env(safe-area-inset-bottom)+4rem)]')}>
        <Outlet />
      </main>
      {showChrome ? <BottomNav /> : null}
    </div>
  );
}
