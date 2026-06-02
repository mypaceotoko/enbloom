import { Flower2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/50 bg-theme-background/85 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link className="flex items-center gap-2" to="/home">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-theme-main text-white shadow-lg shadow-theme-main/25">
            <Flower2 size={20} />
          </span>
          <span>
            <span className="block text-base font-black leading-none text-theme-text">EnBloom</span>
            <span className="text-[11px] font-semibold text-theme-muted">縁が、恋に咲く。</span>
          </span>
        </Link>
        <Link
          className="flex items-center gap-1 rounded-full bg-theme-accent-soft px-3 py-2 text-xs font-bold text-theme-text"
          to="/safety"
        >
          <ShieldCheck size={14} />
          安心ガイド
        </Link>
      </div>
    </header>
  );
}
