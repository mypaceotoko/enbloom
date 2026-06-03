/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentUser as defaultCurrentUser } from '../data/mockUsers';
import { loadFromStorage, saveToStorage } from '../lib/storage';
import type { AppState } from '../types/appState';
import type { Message } from '../types/message';
import type { CurrentUserProfile, ThemeId } from '../types/user';

const APP_STATE_STORAGE_KEY = 'enbloom.appState.v1';
const THEME_STORAGE_KEY = 'enbloom.theme';
const mutualLikeSeedUserIds = ['mio', 'akari'];

const defaultMessages = (matchId: string): Message[] => [
  {
    id: `${matchId}-seed-1`,
    matchId,
    senderId: matchId,
    body: '紹介してもらえて嬉しいです。まずはゆっくりお話しできたら嬉しいです。',
    createdAt: new Date('2026-06-01T09:00:00.000Z').toISOString(),
  },
  {
    id: `${matchId}-seed-2`,
    matchId,
    senderId: 'current-user',
    body: 'こちらこそ、安心できるペースでお話ししましょう。',
    createdAt: new Date('2026-06-01T09:04:00.000Z').toISOString(),
  },
];

function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'natural';
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return ['natural', 'sakura', 'mint', 'lavender', 'night'].includes(storedTheme ?? '') ? (storedTheme as ThemeId) : 'natural';
}

function createDefaultAppState(): AppState {
  const themePreference = getInitialTheme();

  return {
    currentUser: { ...defaultCurrentUser, themePreference },
    onboardingCompleted: false,
    likedUserIds: [],
    receivedLikeUserIds: mutualLikeSeedUserIds,
    matchedUserIds: [],
    messagesByMatchId: {},
    blockedUserIds: [],
    reportedUserIds: [],
    themePreference,
  };
}

type AppStateContextValue = AppState & {
  saveCurrentUserProfile: (profile: CurrentUserProfile) => void;
  completeOnboarding: (profile: CurrentUserProfile) => void;
  setThemePreference: (themeId: ThemeId) => void;
  toggleLike: (userId: string) => boolean;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  reportUser: (userId: string) => void;
  sendMessage: (matchId: string, body: string) => void;
  ensureMatchMessages: (matchId: string) => void;
  resetDemoState: () => void;
  isLiked: (userId: string) => boolean;
  isMatched: (userId: string) => boolean;
  isBlocked: (userId: string) => boolean;
  isReported: (userId: string) => boolean;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

function withUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(() => loadFromStorage(APP_STATE_STORAGE_KEY, createDefaultAppState()));

  useEffect(() => {
    saveToStorage(APP_STATE_STORAGE_KEY, appState);
  }, [appState]);

  const value = useMemo<AppStateContextValue>(() => {
    function saveCurrentUserProfile(profile: CurrentUserProfile) {
      setAppState((current) => ({
        ...current,
        currentUser: profile,
        themePreference: profile.themePreference,
      }));
    }

    function completeOnboarding(profile: CurrentUserProfile) {
      setAppState((current) => ({
        ...current,
        currentUser: profile,
        onboardingCompleted: true,
        themePreference: profile.themePreference,
      }));
    }

    function resetDemoState() {
      const nextState = createDefaultAppState();
      setAppState(nextState);
      saveToStorage(APP_STATE_STORAGE_KEY, nextState);
    }

    function setThemePreference(themeId: ThemeId) {
      setAppState((current) => ({
        ...current,
        themePreference: themeId,
        currentUser: { ...current.currentUser, themePreference: themeId },
      }));
    }

    function toggleLike(userId: string) {
      const likedNow = appState.likedUserIds.includes(userId);
      const newlyMatched = !likedNow && appState.receivedLikeUserIds.includes(userId) && !appState.matchedUserIds.includes(userId);

      setAppState((current) => {
        const liked = current.likedUserIds.includes(userId);
        const likedUserIds = liked ? current.likedUserIds.filter((id) => id !== userId) : [...current.likedUserIds, userId];
        const shouldMatch = !liked && current.receivedLikeUserIds.includes(userId);
        const matchedUserIds = shouldMatch ? withUnique(current.matchedUserIds, userId) : current.matchedUserIds;
        const messagesByMatchId = shouldMatch && !current.messagesByMatchId[userId]
          ? { ...current.messagesByMatchId, [userId]: defaultMessages(userId) }
          : current.messagesByMatchId;

        return { ...current, likedUserIds, matchedUserIds, messagesByMatchId };
      });

      return newlyMatched;
    }

    function blockUser(userId: string) {
      setAppState((current) => ({
        ...current,
        blockedUserIds: withUnique(current.blockedUserIds, userId),
        likedUserIds: current.likedUserIds.filter((id) => id !== userId),
        matchedUserIds: current.matchedUserIds.filter((id) => id !== userId),
      }));
    }

    function unblockUser(userId: string) {
      setAppState((current) => ({
        ...current,
        blockedUserIds: current.blockedUserIds.filter((id) => id !== userId),
      }));
    }

    function reportUser(userId: string) {
      setAppState((current) => ({ ...current, reportedUserIds: withUnique(current.reportedUserIds, userId) }));
    }

    function ensureMatchMessages(matchId: string) {
      setAppState((current) => current.messagesByMatchId[matchId]
        ? current
        : { ...current, messagesByMatchId: { ...current.messagesByMatchId, [matchId]: defaultMessages(matchId) } });
    }

    function sendMessage(matchId: string, body: string) {
      const trimmedBody = body.trim();
      if (!trimmedBody) return;

      const message: Message = {
        id: `${matchId}-${Date.now()}`,
        matchId,
        senderId: 'current-user',
        body: trimmedBody,
        createdAt: new Date().toISOString(),
      };

      setAppState((current) => ({
        ...current,
        messagesByMatchId: {
          ...current.messagesByMatchId,
          [matchId]: [...(current.messagesByMatchId[matchId] ?? defaultMessages(matchId)), message],
        },
      }));
    }

    return {
      ...appState,
      saveCurrentUserProfile,
      completeOnboarding,
      setThemePreference,
      toggleLike,
      blockUser,
      unblockUser,
      reportUser,
      sendMessage,
      ensureMatchMessages,
      resetDemoState,
      isLiked: (userId: string) => appState.likedUserIds.includes(userId),
      isMatched: (userId: string) => appState.matchedUserIds.includes(userId),
      isBlocked: (userId: string) => appState.blockedUserIds.includes(userId),
      isReported: (userId: string) => appState.reportedUserIds.includes(userId),
    };
  }, [appState]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppStateContext() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
