# Using the app offline, and installing it on each platform

The app is a Progressive Web App (PWA). Nothing about your data changes — it was already
stored locally in the browser (IndexedDB) since Phase 1. What this adds is:

* the app shell (HTML/CSS/JS, icons) is cached by a service worker, so the app itself opens
  without an internet connection, not just your data;
* a manifest that lets the browser install the app as a standalone program with its own icon,
  instead of only being a browser tab.

Run `npm run build` and serve the `dist/` folder over **https** (or `http://localhost`) — service
workers refuse to run on plain `http://` for any other address. `npm run preview` does this
locally. Once it's installed, closing your Wi-Fi/mobile data does not close the app.

## Windows / macOS / Linux (desktop)

**Chrome or Edge:** open the app, click the install icon (⊕/monitor icon) in the address bar,
or use the in-app "App installieren" banner. The app then opens in its own window, has a
taskbar/dock icon, and appears in your Start Menu / Applications like a normal program.

**Safari on macOS:** File → "Add to Dock" (Safari 17+; on the same engine as iOS, so it uses
the manifest icons too).

**Firefox on desktop** does not support installing PWAs as of this writing; use Chrome or Edge.

## Android

Open the app in Chrome. Either tap the in-app "App installieren" banner, or Chrome's own
"Zum Startbildschirm hinzufügen" banner/menu entry. The app gets a normal launcher icon and
opens without browser tabs or address bar.

## iPhone / iPad (Safari)

iOS Safari has no automatic install prompt, so the in-app banner shows the three steps instead:
**Teilen (Share) → "Zum Home-Bildschirm" → "Hinzufügen"**. The app then behaves like any other
app: own icon, no Safari UI, and it keeps working offline.

## What "offline" covers

* Opening the app, browsing subjects/topics, PDF/HTML summaries, exercises, settings — all
  fully offline once the app has been opened online at least once.
* New PDFs/HTML/exercises can be imported and `.learn` files exported/imported while offline,
  since importing only reads a file already on the device.
* An internet connection is only needed the first time (to download the app) and to pick up
  a newer version later — updates install automatically the next time you open the app.

## For developers: how it's implemented

* `vite-plugin-pwa` (`vite.config.ts`) generates the service worker and `manifest.webmanifest`
  at build time. `registerType: 'autoUpdate'` means a new deployment is picked up on the next
  app start with no user action.
* Icons live in `public/icons/` (see `docs/OFFLINE_AND_DESKTOP.md` folder listing): regular,
  `maskable-*` (Android adaptive icons) and `apple-touch-icon.png` (iOS).
* `src/pwa/registerSW.ts` registers the service worker; `src/pwa/InstallProvider.tsx` +
  `src/components/InstallBanner.tsx` implement the "Installieren" banner (native prompt on
  Chrome/Edge/Android, manual steps on iOS Safari, hidden once installed or dismissed).
* Nothing here is specific to this app's data model — the same setup would carry over to a
  Tauri/Capacitor wrapper unchanged, since the app already uses relative paths and hash routing.
