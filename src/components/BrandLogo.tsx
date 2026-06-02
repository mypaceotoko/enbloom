import { useState } from 'react';
import { Flower2 } from 'lucide-react';
import { logoAssets, type LogoVariant } from '../config/brandAssets';

type BrandLogoProps = {
  variant?: LogoVariant;
  showText?: boolean;
  className?: string;
};

export function BrandLogo({ variant = 'default', showText = true, className = '' }: BrandLogoProps) {
  const asset = logoAssets[variant];
  const [sourceIndex, setSourceIndex] = useState(0);
  const currentSource = asset.sources[sourceIndex];

  const handleImageError = () => {
    setSourceIndex((current) => current + 1);
  };

  return (
    <span className={`flex items-center gap-2 ${className}`.trim()}>
      {currentSource ? (
        <img
          alt={showText ? '' : asset.alt}
          className="h-10 w-10 rounded-2xl object-contain shadow-lg shadow-theme-main/20"
          src={currentSource}
          onError={handleImageError}
        />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-2xl bg-theme-main text-white shadow-lg shadow-theme-main/25">
          <Flower2 size={20} />
        </span>
      )}
      {showText ? (
        <span>
          <span className="block text-base font-black leading-none text-theme-text">EnBloom</span>
          <span className="text-[11px] font-semibold text-theme-muted">縁が、恋に咲く。</span>
        </span>
      ) : null}
    </span>
  );
}
