import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-theme-sky/20 bg-white px-3 py-2 shadow-[0_8px_28px_rgba(16,42,67,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        <Link className="min-w-0 flex-1" to="/home">
          <BrandLogo className="w-full max-w-[285px] sm:max-w-[310px]" imageClassName="max-h-14 sm:max-h-16" variant="default" />
        </Link>
        <Link
          className="flex shrink-0 items-center gap-1 rounded-full border border-theme-sky/30 bg-gradient-to-r from-theme-yellow/90 via-white/90 to-theme-sky/35 px-2.5 py-2 text-[11px] font-black text-theme-main-dark shadow-sm shadow-theme-sky/20 transition hover:border-theme-cyan/45 hover:shadow-md"
          to="/safety"
        >
          <ShieldCheck size={14} />
          安心ガイド
        </Link>
      </div>
    </header>
  );
}
