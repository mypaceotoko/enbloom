import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-theme-sky/15 bg-white px-3.5 pb-1 pt-1.5 shadow-[0_10px_26px_rgba(16,42,67,0.045)]">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2.5 sm:gap-3">
        <Link className="min-w-0 flex-1 -translate-y-1 -mb-2 pr-1.5" to="/home">
          <BrandLogo
            className="w-full max-w-[280px] sm:max-w-[350px]"
            imageClassName="max-h-20 drop-shadow-none sm:max-h-[5.5rem]"
            variant="default"
          />
        </Link>
        <Link
          className="flex shrink-0 -translate-y-1 items-center gap-1 whitespace-nowrap rounded-full border border-theme-sky/25 bg-gradient-to-r from-theme-yellow/80 via-white to-theme-sky/25 px-2.5 py-1.5 text-[11px] font-black text-theme-main-dark shadow-sm shadow-theme-sky/15 transition hover:border-theme-cyan/45 hover:shadow-md sm:px-3"
          to="/safety"
        >
          <ShieldCheck size={14} />
          安心ガイド
        </Link>
      </div>
    </header>
  );
}
