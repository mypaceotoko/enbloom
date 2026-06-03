import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-theme-border/70 bg-theme-background/90 px-4 py-2.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2.5">
        <Link className="min-w-0 flex-1" to="/home">
          <BrandLogo className="w-full max-w-[210px] sm:max-w-[230px]" imageClassName="max-h-12" variant="default" />
        </Link>
        <Link
          className="flex shrink-0 items-center gap-1 rounded-full border border-theme-yellow/45 bg-gradient-to-r from-theme-yellow/95 via-theme-cyan/85 to-theme-sky/85 px-3 py-2 text-xs font-black text-theme-main-dark shadow-lg shadow-theme-main/15"
          to="/safety"
        >
          <ShieldCheck size={14} />
          安心ガイド
        </Link>
      </div>
    </header>
  );
}
