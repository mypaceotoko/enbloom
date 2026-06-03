import { ClipboardList, Compass, Home, MessagesSquare, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/home', label: 'ホーム', icon: Home },
  { to: '/discover', label: '探す', icon: Compass },
  { to: '/board', label: '募集', icon: ClipboardList },
  { to: '/rooms', label: 'ルーム', icon: MessagesSquare },
  { to: '/settings', label: '設定', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-1.5">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.35rem] border border-theme-sky/25 bg-white/95 p-1.5 shadow-2xl shadow-theme-sky/15 backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9.5px] font-black text-theme-muted transition active:scale-[0.97]',
                  isActive && 'bg-gradient-to-b from-theme-yellow/35 via-theme-accent-soft/80 to-theme-card text-theme-main-dark shadow-inner ring-1 ring-theme-sky/30',
                )
              }
              key={item.to}
              to={item.to}
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex size-6 items-center justify-center rounded-full', isActive && 'bg-gradient-to-br from-theme-yellow/85 via-theme-sky/35 to-theme-cyan/25 text-theme-main-dark shadow-sm shadow-theme-sky/15')}>
                    <Icon size={16} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
