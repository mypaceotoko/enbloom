import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { cn } from '../lib/utils';

const noChromePaths = ['/', '/login'];

export function Layout() {
  const { pathname } = useLocation();
  const showChrome = !noChromePaths.includes(pathname);

  return (
    <div className="min-h-screen text-theme-text">
      {showChrome ? <Header /> : null}
      <main
        className={cn(
          'mx-auto min-h-screen max-w-md',
          showChrome
            ? 'pb-[calc(env(safe-area-inset-bottom)+11rem)]'
            : 'pb-[calc(env(safe-area-inset-bottom)+4rem)]',
        )}
      >
        <Outlet />
      </main>
      {showChrome ? <BottomNav /> : null}
    </div>
  );
}
