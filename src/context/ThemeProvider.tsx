/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { brandPalette } from '../config/brandTheme';

export type ThemeId = 'natural' | 'sakura' | 'mint' | 'lavender' | 'night';

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    main: string;
    mainDark: string;
    accent: string;
    accentSoft: string;
    background: string;
    card: string;
    text: string;
    muted: string;
  };
};

export const themes: ThemeDefinition[] = [
  {
    id: 'natural',
    name: 'ConnectBloom Blue',
    description: '黄色とシアンブルーで、紹介から共創がひらく標準テーマ',
    colors: {
      main: brandPalette.vividBlue,
      mainDark: brandPalette.navyText,
      accent: brandPalette.aquaCyan,
      accentSoft: brandPalette.paleBlueBackground,
      background: brandPalette.background,
      card: brandPalette.surface,
      text: brandPalette.navyText,
      muted: brandPalette.slateGray,
    },
  },
  {
    id: 'sakura',
    name: 'Yellow Bloom',
    description: 'Primary Yellowを強調に使う、明るく親しみやすいテーマ',
    colors: {
      main: brandPalette.vividBlue,
      mainDark: brandPalette.navyText,
      accent: brandPalette.primaryYellow,
      accentSoft: '#FFF7C2',
      background: '#F8FBFF',
      card: brandPalette.surface,
      text: brandPalette.navyText,
      muted: brandPalette.slateGray,
    },
  },
  {
    id: 'mint',
    name: 'Aqua Bloom',
    description: 'Aqua / Cyanを軸にした、清潔感のある共創テーマ',
    colors: {
      main: brandPalette.aquaCyan,
      mainDark: brandPalette.navyText,
      accent: brandPalette.skyBlue,
      accentSoft: '#DDFBFA',
      background: '#F4FEFF',
      card: brandPalette.surface,
      text: brandPalette.navyText,
      muted: brandPalette.slateGray,
    },
  },
  {
    id: 'lavender',
    name: 'Sky Bloom',
    description: '淡い空色グラデーションで、やわらかい信頼感を出すテーマ',
    colors: {
      main: brandPalette.skyBlue,
      mainDark: brandPalette.navyText,
      accent: brandPalette.vividBlue,
      accentSoft: '#EAF7FF',
      background: '#F5FBFF',
      card: brandPalette.surface,
      text: brandPalette.navyText,
      muted: brandPalette.slateGray,
    },
  },
  {
    id: 'night',
    name: 'Night Blue',
    description: 'ネイビーの中にシアンと黄色が光るダークテーマ',
    colors: {
      main: brandPalette.skyBlue,
      mainDark: '#D9F2FF',
      accent: brandPalette.primaryYellow,
      accentSoft: '#123158',
      background: '#07162D',
      card: '#0D2442',
      text: '#F4FBFF',
      muted: '#B9D3E8',
    },
  },
];

const THEME_STORAGE_KEY = 'connectbloom.theme';
const LEGACY_STORAGE_PREFIX = 'en' + 'bloom';
const LEGACY_THEME_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}.theme`;

type ThemeContextValue = {
  themeId: ThemeId;
  currentTheme: ThemeDefinition;
  setThemeId: (themeId: ThemeId) => void;
  themes: ThemeDefinition[];
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeId(value: string | null): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') {
      return 'natural';
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return isThemeId(storedTheme) ? storedTheme : 'natural';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(() => {
    const currentTheme = themes.find((theme) => theme.id === themeId) ?? themes[0];

    return {
      themeId,
      currentTheme,
      setThemeId: setThemeIdState,
      themes,
    };
  }, [themeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
