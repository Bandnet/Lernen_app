import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Repository } from '../data/repository';
import { readMirror, writeMirror } from '../utils/mirror';
import {
  applyAccent,
  applyTheme,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  isHexColor,
  isThemeMode,
  KEYS,
  type ThemeMode,
} from './theme';

interface SettingsValue {
  theme: ThemeMode;
  accent: string;
  setTheme: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const mirrored = readMirror(KEYS.themeMirror);
    return isThemeMode(mirrored) ? mirrored : DEFAULT_THEME;
  });
  const [accent, setAccentState] = useState<string>(() => {
    const mirrored = readMirror(KEYS.accentMirror);
    return isHexColor(mirrored) ? mirrored : DEFAULT_ACCENT;
  });
  const accentTimer = useRef<number | undefined>(undefined);

  // Load the saved values (source of truth) once.
  useEffect(() => {
    let active = true;
    Promise.all([repository.getMeta<unknown>(KEYS.themeMeta), repository.getMeta<unknown>(KEYS.accentMeta)])
      .then(([savedTheme, savedAccent]) => {
        if (!active) return;
        if (isThemeMode(savedTheme)) {
          setThemeState(savedTheme);
          writeMirror(KEYS.themeMirror, savedTheme);
        }
        if (isHexColor(savedAccent)) {
          setAccentState(savedAccent);
          writeMirror(KEYS.accentMirror, savedAccent);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => applyAccent(accent), [accent]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      if (!isThemeMode(mode)) return;
      setThemeState(mode);
      writeMirror(KEYS.themeMirror, mode);
      repository.setMeta(KEYS.themeMeta, mode).catch(() => undefined);
    },
    [repository],
  );

  const setAccent = useCallback(
    (hex: string) => {
      if (!isHexColor(hex)) return;
      const value = hex.toLowerCase();
      setAccentState(value);
      writeMirror(KEYS.accentMirror, value);
      // The colour picker fires continuously while dragging; save only the final value.
      window.clearTimeout(accentTimer.current);
      accentTimer.current = window.setTimeout(() => {
        repository.setMeta(KEYS.accentMeta, value).catch(() => undefined);
      }, 250);
    },
    [repository],
  );

  const value = useMemo(() => ({ theme, accent, setTheme, setAccent }), [theme, accent, setTheme, setAccent]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
