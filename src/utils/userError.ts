import type { Translate } from '../exercises/definition';
import type { TranslationKey } from '../i18n/translations';

/** An error whose message can be shown to the user (as a translation key). */
export class UserFacingError extends Error {
  constructor(
    public key: TranslationKey,
    public vars?: Record<string, string | number>,
    /** Optional underlying user-facing error, appended to the message. */
    public detail?: unknown,
  ) {
    super(key);
  }
}

/** Translates any error into a friendly message; unknown errors never leak technical details. */
export function describeError(error: unknown, t: Translate): string {
  if (error instanceof UserFacingError) {
    const message = t(error.key, error.vars);
    return error.detail instanceof UserFacingError ? `${message} ${describeError(error.detail, t)}` : message;
  }
  return t('errorGeneric');
}
