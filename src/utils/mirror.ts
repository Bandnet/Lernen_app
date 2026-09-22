/**
 * Tiny localStorage mirror of a few settings. IndexedDB stays the source of truth;
 * the mirror only lets the page start in the right theme/language without flashing.
 * Every access is guarded because storage can be unavailable (private mode, wrappers).
 */
export function readMirror(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeMirror(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
