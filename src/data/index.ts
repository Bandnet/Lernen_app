import { IndexedDbRepository } from './indexedDbRepository';
import type { Repository } from './repository';

/** The single repository instance used by the app. Swap here for a cloud backend. */
export const repository: Repository = new IndexedDbRepository();
