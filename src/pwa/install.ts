import { createContext, useContext } from 'react';

/** The `beforeinstallprompt` event, kept around until the user clicks "Install". */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own flag (not covered by the media query there).
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

interface InstallContextValue {
  /** Chrome/Edge/Android: fires the native install prompt. Null when unavailable. */
  promptInstall: (() => Promise<void>) | null;
  /** iOS Safari has no install prompt API; show manual instructions instead. */
  showIosInstructions: boolean;
  installed: boolean;
}

export const InstallContext = createContext<InstallContextValue>({
  promptInstall: null,
  showIosInstructions: false,
  installed: false,
});

export function useInstall(): InstallContextValue {
  return useContext(InstallContext);
}
