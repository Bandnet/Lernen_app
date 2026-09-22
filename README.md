# Lernen / Learn

Personal learning app: Fach → Lernthema → Zusammenfassung + Aufgaben.
Local-first (IndexedDB), no account, no backend.

## Run

    npm install
    npm run dev

Production build: `npm run build` (output in `dist/`).

## Structure

    src/
      types/        domain models
      data/         Repository interface + IndexedDB implementation (swap for a cloud backend later)
      i18n/         translations (de/en) + provider
      context/      LibraryContext (subjects + topics state)
      components/   reusable UI
      pages/        Dashboard, Topic
      styles/       global.css (design tokens, light/dark)

## Summaries (Phase 2)

- PDF: stored as a Blob and shown with the browser's own PDF viewer inside the page.
- HTML: stored as a Blob and shown in a sandboxed iframe. Scripts, frames, plugins and
  inline event handlers are removed, a strict Content-Security-Policy is added, and the
  iframe has no `allow-scripts` / `allow-same-origin`. Interactive (JavaScript) pages
  therefore show only their static content.
- HTML images / CSS / fonts: select them together with the HTML file when importing;
  they are stored with the summary and inlined when displayed.
- A sample summary lives in `examples/zellaufbau-summary.html`.

## Exercises (Phase 3)

Exercise files are JSON, documented in `docs/EXERCISES.md`; example in
`examples/exercises-example.json`. Each exercise type lives in `src/exercises/types/`
(validation, answer checking and UI in one place) and is registered in
`src/exercises/registry.ts`.

## Progress (Phase 4)

Progress of a topic = share of its exercises whose most recent answer was correct
(`src/progress/`). It is stored per topic, shown on the topic card and the topic page,
and reset when the exercise file is replaced or removed.

## Import / export (Phase 5)

"Exportieren" (topic page) creates one `.learn` file, "Importieren" (main menu) reads it.
The format is documented in `docs/LEARN_FORMAT.md`; code lives in `src/learn/`.

## Settings (Phase 6)

Language, appearance (system / light / dark) and accent color are stored in IndexedDB.
A small localStorage mirror lets the page start in the right theme without flashing
(`index.html` applies it before the first paint). Code: `src/settings/`, `src/pages/SettingsPage.tsx`.

## Status

- [x] Phase 1: setup, main menu, subjects, topics, persistent storage
- [x] Phase 2: PDF/HTML summary viewer
- [x] Phase 3: exercise JSON system + answer checking (+ learning session and result screen)
- [x] Phase 4: progress + score
- [x] Phase 5: .learn import/export
- [x] Phase 6: settings (language, theme, accent)
- [x] Phase 7: polish, responsive, error handling

## Robustness (Phase 7)

- Every import (PDF/HTML, exercises JSON, `.learn`) is validated and shows a plain-language message on failure.
- Damaged records in the local database are ignored; an unexpected rendering error shows a
  recovery screen instead of a blank page (`src/components/ErrorBoundary.tsx`).
- The app asks the browser to keep its storage persistent (best effort).
- Back up important topics with "Exportieren": browser data can be cleared by the user or the browser.

## Offline / installable app (PWA)

The app works fully offline and can be installed on Windows, macOS, Linux, Android and iOS as
a standalone app with its own icon. See `docs/OFFLINE_AND_DESKTOP.md` for how to install it on
each platform and how it's implemented (`vite-plugin-pwa`, `src/pwa/`).

## Ideas for later

Backup of all topics at once, more exercise types (see `docs/EXERCISES.md`), Tauri/Capacitor wrappers (the app uses relative paths, hash routing and no desktop-only APIs),
and AI features (keep them behind a small service interface next to `src/data/`).
