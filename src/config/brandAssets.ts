export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

export const officialHorizontalLogo = '/public:assets:brand:connectbloom-logo-horizontal-tagline-transparent.png.jpg';

export type LogoAsset = {
  variant: LogoVariant;
  /**
   * Ordered by preference. The horizontal PNG is the manually uploaded
   * official ConnectBloom logo in public/ and should be used for primary brand placements.
   */
  sources: string[];
  alt: string;
  width: number;
  height: number;
};

export const logoAssets: Record<LogoVariant, LogoAsset> = {
  default: {
    variant: 'default',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 1776,
    height: 472,
  },
  light: {
    variant: 'light',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 1776,
    height: 472,
  },
  dark: {
    variant: 'dark',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 1776,
    height: 472,
  },
  icon: {
    variant: 'icon',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 1776,
    height: 472,
  },
};

export const appIconAssets = {
  favicon: '/icon.svg',
  svgIcon: '/icon.svg',
  appleTouchIcon: '/icon.svg',
  manifest: '/site.webmanifest',
} as const;
