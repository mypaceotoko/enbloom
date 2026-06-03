import { logoAssets, type LogoVariant } from '../config/brandAssets';
import { cn } from '../lib/utils';

type BrandLogoProps = {
  variant?: LogoVariant;
  showText?: boolean;
  className?: string;
  imageClassName?: string;
};

type BrandMarkProps = {
  className?: string;
  monochrome?: boolean;
};

export function BrandMark({ className = '', monochrome = false }: BrandMarkProps) {
  const asset = logoAssets.icon;

  return (
    <img
      alt={asset.alt}
      className={cn('block size-full object-contain', monochrome && 'opacity-85 grayscale', className)}
      decoding="async"
      draggable={false}
      src={asset.sources[0]}
    />
  );
}

export function BrandLogo({ variant = 'default', showText = true, className = '', imageClassName = '' }: BrandLogoProps) {
  const asset = logoAssets[variant === 'icon' || !showText ? 'icon' : variant];
  const isIconOnly = variant === 'icon' || !showText;

  if (isIconOnly) {
    return (
      <span className={cn('inline-flex size-10 shrink-0 items-center justify-center', className)}>
        <BrandMark className={imageClassName} />
      </span>
    );
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center', className)}>
      <img
        alt={asset.alt}
        className={cn(
          'brand-logo-image block h-auto w-auto max-w-full select-none object-contain drop-shadow-[0_10px_24px_rgba(64,181,255,0.14)]',
          imageClassName,
        )}
        decoding="async"
        draggable={false}
        height={627}
        src={asset.sources[0]}
        width={2508}
      />
    </span>
  );
}
