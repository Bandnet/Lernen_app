import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and keeps the app updated in the background.
 * New versions are swapped in automatically the next time the app starts
 * (there is no user data in the service worker cache, so this is safe).
 */
export function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}
