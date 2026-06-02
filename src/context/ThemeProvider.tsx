import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
    name: 'EnBloom Natural',
    description: 'やさしい信頼感を軸にした標準テーマ',
    colors: {
      main: '#6DBE8A',
      mainDark: '#3E7C59',
      accent: '#F48CA8',
      accentSoft: '#FDE7EE',
      background: '#FFFDF9',
      card: '#FFFFFF',
      text: '#2F3A34',
      muted: '#7A8A80',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura Bloom',
    description: '桜のような温かさと恋のアクセント',
    colors: {
      main: '#F48CA8',
      mainDark: '#C85F7D',
      accent: '#6DBE8A',
      accentSoft: '#FDE7EE',
      background: '#FFF8FA',
      card: '#FFFFFF',
      text: '#3A2F34',
      muted: '#8A747C',
    },
  },
  {
    id: 'mint',
    name: 'Mint Bloom',
    description: '清潔感と自然体の軽やかさ',
    colors: {
      main: '#7BCFA6',
      mainDark: '#3E8A67',
      accent: '#F48CA8',
      accentSoft: '#E4F8EE',
      background: '#FCFFFD',
      card: '#FFFFFF',
      text: '#263A32',
      muted: '#6F877A',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender Bloom',
    description: '上品で落ち着いた余韻のあるテーマ',
    colors: {
      main: '#9B8FE8',
      mainDark: '#6E61BA',
      accent: '#F48CA8',
      accentSoft: '#EEEAFE',
      background: '#FFFCFF',
      card: '#FFFFFF',
      text: '#302B3A',
      muted: '#7D758A',
    },
  },
  {
    id: 'night',
    name: 'Night Bloom',
    description: '夜にも花がひらく落ち着いたダークテーマ',
    colors: {
      main: '#6DBE8A',
      mainDark: '#9EE3B4',
      accent: '#F48CA8',
      accentSoft: '#392632',
      background: '#16221B',
      card: '#213128',
      text: '#F4FFF8',
      muted: '#AFC8B7',
    },
  },
];

const THEME_STORAGE_KEY = 'enbloom.theme';

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

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
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
