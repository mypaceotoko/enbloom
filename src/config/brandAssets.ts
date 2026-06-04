export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

export const officialHorizontalLogo = '/connectbloom-logo-horizontal.png';

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
    width: 2172,
    height: 724,
  },
  light: {
    variant: 'light',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 2172,
    height: 724,
  },
  dark: {
    variant: 'dark',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 2172,
    height: 724,
  },
  icon: {
    variant: 'icon',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
    width: 2172,
    height: 724,
  },
};

export const appIconAssets = {
  favicon: '/icon.svg',
  svgIcon: '/icon.svg',
  appleTouchIcon: '/icon.svg',
  manifest: '/site.webmanifest',
} as const;
