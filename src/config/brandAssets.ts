export type LogoVariant = 'default' | 'light' | 'dark' | 'icon';

export type LogoAsset = {
  variant: LogoVariant;
  /**
   * Ordered by preference. Put future assets such as /logo-dark.svg before
   * their PNG fallback to keep replacements simple.
   */
  sources: string[];
  alt: string;
};

export const logoAssets: Record<LogoVariant, LogoAsset> = {
  default: {
    variant: 'default',
    sources: ['/logo.svg', '/logo.png'],
    alt: 'EnBloom',
  },
  light: {
    variant: 'light',
    sources: ['/logo-light.svg', '/logo-light.png', '/logo.svg', '/logo.png'],
    alt: 'EnBloom',
  },
  dark: {
    variant: 'dark',
    sources: ['/logo-dark.svg', '/logo-dark.png', '/logo.svg', '/logo.png'],
    alt: 'EnBloom',
  },
  icon: {
    variant: 'icon',
    sources: ['/logo-icon.svg', '/logo-icon.png', '/logo.svg', '/logo.png'],
    alt: 'EnBloom',
  },
};

export const appIconAssets = {
  favicon: '/favicon.ico',
  svgIcon: '/icon.svg',
  appleTouchIcon: '/apple-touch-icon.png',
  manifest: '/site.webmanifest',
} as const;
