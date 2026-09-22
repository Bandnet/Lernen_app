import { UserFacingError } from '../utils/userError';

/** A problem with an exercise file that the user can understand and fix. */
export class ExerciseImportError extends UserFacingError {}
