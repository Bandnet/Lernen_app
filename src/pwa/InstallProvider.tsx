import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { type BeforeInstallPromptEvent, InstallContext, isIosSafari, isStandalone } from './install';

/** Listens for the browser's install prompt and exposes it to the rest of the app. */
export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const value = useMemo(
    () => ({
      promptInstall: deferred
        ? async () => {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === 'accepted') setInstalled(true);
            setDeferred(null);
          }
        : null,
      showIosInstructions: !installed && isIosSafari(),
      installed,
    }),
    [deferred, installed],
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}
