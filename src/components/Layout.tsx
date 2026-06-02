import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

const noChromePaths = ['/', '/login'];

export function Layout() {
  const { pathname } = useLocation();
  const showChrome = !noChromePaths.includes(pathname);

  return (
    <div className="min-h-screen text-theme-text">
      {showChrome ? <Header /> : null}
      <main className="mx-auto min-h-screen max-w-md pb-[calc(env(safe-area-inset-bottom)+8.5rem)]">
        <Outlet />
      </main>
      {showChrome ? <BottomNav /> : null}
    </div>
  );
}
