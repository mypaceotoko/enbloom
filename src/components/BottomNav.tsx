import { Compass, Heart, Home, MessageCircle, Settings, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/home', label: 'ホーム', icon: Home },
  { to: '/discover', label: '探す', icon: Compass },
  { to: '/likes', label: 'いいね', icon: Heart },
  { to: '/matches', label: 'マッチ', icon: MessageCircle },
  { to: '/my-profile', label: '自分', icon: UserRound },
  { to: '/settings', label: '設定', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-theme-card/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold text-theme-muted transition',
                  isActive && 'bg-theme-accent-soft text-theme-main-dark',
                )
              }
              key={item.to}
              to={item.to}
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
