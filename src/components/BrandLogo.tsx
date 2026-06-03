import { brandCopy, brandName } from '../config/brandTheme';
import type { LogoVariant } from '../config/brandAssets';
import { cn } from '../lib/utils';

type BrandLogoProps = {
  variant?: LogoVariant;
  showText?: boolean;
  className?: string;
};

type BrandMarkProps = {
  className?: string;
  monochrome?: boolean;
};

export function BrandMark({ className = '', monochrome = false }: BrandMarkProps) {
  const stroke = monochrome ? 'currentColor' : 'url(#connectbloom-mark-stroke)';

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="connectbloom-mark-stroke" x1="48" x2="48" y1="6" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD600" />
          <stop offset="0.43" stopColor="#00D4CE" />
          <stop offset="1" stopColor="#0057FF" />
        </linearGradient>
        <linearGradient id="connectbloom-mark-fill" x1="48" x2="48" y1="24" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD600" />
          <stop offset="0.48" stopColor="#00D4CE" />
          <stop offset="1" stopColor="#0057FF" />
        </linearGradient>
      </defs>
      <g stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="7.5">
        <path d="M48 43C38 31 38 19 48 12C58 19 58 31 48 43Z" />
        <path d="M42 49C25 48 16 39 20 27C32 24 43 30 48 43" />
        <path d="M54 49C71 48 80 39 76 27C64 24 53 30 48 43" />
        <path d="M43 53C31 66 18 66 12 55C17 43 29 41 42 49" />
        <path d="M53 53C65 66 78 66 84 55C79 43 67 41 54 49" />
        <path d="M48 56C60 68 59 82 48 88C37 82 36 68 48 56Z" />
      </g>
      <g fill={monochrome ? 'currentColor' : 'url(#connectbloom-mark-fill)'}>
        <circle cx="28" cy="42" r="5.8" />
        <circle cx="72" cy="42" r="5.8" />
        <circle cx="37" cy="25" r="5.8" />
        <circle cx="59" cy="25" r="5.8" />
      </g>
      <path d="M48 43C42 50 35 53 26 53C35 57 42 57 48 52C54 57 61 57 70 53C61 53 54 50 48 43Z" fill={monochrome ? 'currentColor' : 'url(#connectbloom-mark-fill)'} opacity="0.95" />
    </svg>
  );
}

export function BrandLogo({ variant = 'default', showText = true, className = '' }: BrandLogoProps) {
  const isLight = variant === 'light';
  const isIconOnly = variant === 'icon' || !showText;

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <span className={cn('flex shrink-0 items-center justify-center rounded-2xl', isIconOnly ? 'size-10' : 'size-11')}>
        <BrandMark className="size-full drop-shadow-[0_8px_18px_rgba(0,87,255,0.16)]" />
      </span>
      {showText ? (
        <span className="brand-logo-text min-w-0 leading-none">
          <span className="block whitespace-nowrap text-[1.05rem] font-black tracking-[-0.045em] sm:text-lg">
            <span className={isLight ? 'text-white' : 'text-theme-text'}>{brandName.slice(0, 7)}</span>
            <span className="bg-gradient-to-r from-theme-yellow via-theme-cyan to-theme-main bg-clip-text text-transparent">{brandName.slice(7)}</span>
          </span>
          <span className={cn('brand-logo-copy mt-1 block whitespace-nowrap text-[10px] font-black tracking-[0.18em] sm:text-[11px]', isLight ? 'text-white/86' : 'text-theme-main-dark')}>
            {brandCopy}
          </span>
        </span>
      ) : null}
    </span>
  );
}
