import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/50 bg-theme-background/85 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link className="flex items-center gap-2" to="/home">
          <BrandLogo variant="default" />
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
