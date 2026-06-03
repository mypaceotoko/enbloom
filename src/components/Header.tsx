import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-theme-border/70 bg-theme-background/88 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <Link className="min-w-0 flex-1" to="/home">
          <BrandLogo className="[&_.brand-logo-copy]:hidden min-[390px]:[&_.brand-logo-copy]:block" variant="default" />
        </Link>
        <Link
          className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-theme-cyan to-theme-main px-3 py-2 text-xs font-black text-white shadow-lg shadow-theme-main/20"
          to="/safety"
        >
          <ShieldCheck size={14} />
          安心ガイド
        </Link>
      </div>
    </header>
  );
}
