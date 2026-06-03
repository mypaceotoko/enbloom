export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

export const officialHorizontalLogo = '/84D299F4-A688-480C-85F2-853E80F09F71.png';

export type LogoAsset = {
  variant: LogoVariant;
  /**
   * Ordered by preference. The horizontal PNG is the manually uploaded
   * official ConnectBloom logo in public/ and should be used for primary brand placements.
   */
  sources: string[];
  alt: string;
};

export const logoAssets: Record<LogoVariant, LogoAsset> = {
  default: {
    variant: 'default',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
  },
  light: {
    variant: 'light',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
  },
  dark: {
    variant: 'dark',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
  },
  icon: {
    variant: 'icon',
    sources: [officialHorizontalLogo],
    alt: 'ConnectBloom',
  },
};

export const appIconAssets = {
  favicon: '/icon.svg',
  svgIcon: '/icon.svg',
  appleTouchIcon: '/icon.svg',
  manifest: '/site.webmanifest',
} as const;
