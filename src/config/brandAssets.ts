export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

export type LogoAsset = {
  variant: LogoVariant;
  /**
   * Ordered by preference. SVG assets are generated from the current
   * ConnectBloom yellow × blue brand system.
   */
  sources: string[];
  alt: string;
};

export const logoAssets: Record<LogoVariant, LogoAsset> = {
  default: {
    variant: 'default',
    sources: ['/logo.svg'],
    alt: 'ConnectBloom',
  },
  light: {
    variant: 'light',
    sources: ['/logo-light.svg', '/logo.svg'],
    alt: 'ConnectBloom',
  },
  dark: {
    variant: 'dark',
    sources: ['/logo-dark.svg', '/logo.svg'],
    alt: 'ConnectBloom',
  },
  icon: {
    variant: 'icon',
    sources: ['/logo-icon.svg', '/icon.svg'],
    alt: 'ConnectBloom',
  },
};

export const appIconAssets = {
  favicon: '/icon.svg',
  svgIcon: '/icon.svg',
  appleTouchIcon: '/icon.svg',
  manifest: '/site.webmanifest',
} as const;
