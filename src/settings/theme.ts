export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];
export const DEFAULT_THEME: ThemeMode = 'system';
export const DEFAULT_ACCENT = '#0a7aff';

export const ACCENT_PRESETS: { value: string; labelKey: 'accentBlue' | 'accentPurple' | 'accentGreen' | 'accentOrange' | 'accentRed' | 'accentPink' }[] = [
  { value: '#0a7aff', labelKey: 'accentBlue' },
  { value: '#8b5cf6', labelKey: 'accentPurple' },
  { value: '#16a34a', labelKey: 'accentGreen' },
  { value: '#f97316', labelKey: 'accentOrange' },
  { value: '#ef4444', labelKey: 'accentRed' },
  { value: '#ec4899', labelKey: 'accentPink' },
];

export const KEYS = {
  themeMeta: 'setting:theme',
  accentMeta: 'setting:accent',
  themeMirror: 'learn-theme',
  accentMirror: 'learn-accent',
  languageMirror: 'learn-language',
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

/** Text colour (black/white) that stays readable on top of the accent colour. */
export function contrastColor(hex: string): string {
  const channel = (start: number) => {
    const c = parseInt(hex.slice(start, start + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.45 ? '#000000' : '#ffffff';
}

/** `system` removes the override so the OS setting (prefers-color-scheme) applies. */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  syncThemeColorMeta(mode);
}

/**
 * Keeps the browser/OS chrome (status bar, task switcher) in sync with the chosen theme.
 * The two `media`-scoped <meta name="theme-color"> tags from index.html only track the OS;
 * once the user picks Light/Dark explicitly we point both at the same color to override them.
 */
function syncThemeColorMeta(mode: ThemeMode): void {
  const light = document.querySelector('meta[name="theme-color"][media*="light"]');
  const dark = document.querySelector('meta[name="theme-color"][media*="dark"]');
  if (!light || !dark) return;
  if (mode === 'system') {
    light.setAttribute('content', '#f5f5f7');
    dark.setAttribute('content', '#000000');
  } else {
    const color = mode === 'dark' ? '#000000' : '#f5f5f7';
    light.setAttribute('content', color);
    dark.setAttribute('content', color);
  }
}

export function applyAccent(hex: string): void {
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-contrast', contrastColor(hex));
}
