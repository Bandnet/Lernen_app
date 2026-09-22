import { unzipSync } from 'fflate';
import type { Repository } from '../data/repository';
import { parseExerciseSetText, type ParsedExerciseSet } from '../exercises/parse';
import { buildSummary, LIMITS, SummaryImportError, type ParsedSummary } from '../summary/importSummary';
import type { Topic } from '../types/models';
import { UserFacingError } from '../utils/userError';
import { isAllowedEntry, LearnFileError, MANIFEST_FILE, parseManifest, type ParsedManifest } from './manifest';

const MB = 1024 * 1024;
export const LEARN_MAX_FILE = 120 * MB;
const MAX_TOTAL_UNPACKED = 150 * MB;
const MAX_ENTRIES = 1000;

/** A fully validated topic, ready to be stored. */
export interface LearnPackage {
  subjectName: string;
  topic: ParsedManifest['topic'];
  summary: ParsedSummary | null;
  exercises: ParsedExerciseSet | null;
}

function entrySizeLimit(name: string): number {
  if (name === 'manifest.json') return 1 * MB;
  if (name === 'exercises.json') return 2 * MB;
  if (name === 'summary.pdf') return LIMITS.pdf;
  if (name === 'summary.html') return LIMITS.html;
  return LIMITS.assets;
}

function extractEntries(bytes: Uint8Array): Record<string, Uint8Array> {
  let count = 0;
  let total = 0;
  try {
    return unzipSync(bytes, {
      // Decides per entry BEFORE it is decompressed, so oversized or unexpected
      // content (zip bombs, path tricks, stray files) is never unpacked.
      filter(file) {
        if (++count > MAX_ENTRIES) throw new LearnFileError('errLearnContentTooLarge');
        if (file.name.endsWith('/') || !isAllowedEntry(file.name)) return false;
        total += file.originalSize;
        if (file.originalSize > entrySizeLimit(file.name) || total > MAX_TOTAL_UNPACKED) {
          throw new LearnFileError('errLearnContentTooLarge');
        }
        return true;
      },
    });
  } catch (e) {
    if (e instanceof LearnFileError) throw e;
    throw new LearnFileError('errLearnCorrupt');
  }
}

/** Reads and validates a `.learn` file without touching the database. */
export async function readLearnFile(file: File): Promise<LearnPackage> {
  if (!/\.learn$/i.test(file.name)) throw new LearnFileError('errLearnFileType');
  if (file.size === 0) throw new LearnFileError('errEmptyFile');
  if (file.size > LEARN_MAX_FILE) throw new LearnFileError('errLearnTooLarge', { max: LEARN_MAX_FILE / MB });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new LearnFileError('errLearnCorrupt'); // "PK"
  const entries = extractEntries(bytes);

  const need = (name: string): Uint8Array => {
    const data = entries[name];
    if (!data) throw new LearnFileError('errLearnMissingFile', { file: name });
    return data;
  };

  let manifestRaw: unknown;
  try {
    manifestRaw = JSON.parse(new TextDecoder('utf-8').decode(need(MANIFEST_FILE)));
  } catch (e) {
    if (e instanceof UserFacingError) throw e;
    throw new LearnFileError('errLearnManifest');
  }
  const manifest = parseManifest(manifestRaw);

  let summary: ParsedSummary | null = null;
  if (manifest.summary) {
    const inputs = [
      { name: manifest.summary.file, blob: new Blob([need(manifest.summary.file)]) },
      ...manifest.summary.assets.map((a) => ({
        name: a.path.split(/[\\/]/).pop() ?? a.path,
        path: a.path,
        blob: new Blob([need(a.file)]),
      })),
    ];
    try {
      summary = { ...(await buildSummary(inputs)), fileName: manifest.summary.fileName };
    } catch (e) {
      if (e instanceof SummaryImportError) throw new LearnFileError('errLearnSummaryInvalid', undefined, e);
      throw e;
    }
  }

  let exercises: ParsedExerciseSet | null = null;
  if (manifest.exercises) {
    try {
      exercises = parseExerciseSetText(new TextDecoder('utf-8').decode(need(manifest.exercises.file)), manifest.topic.name);
    } catch (e) {
      if (e instanceof UserFacingError && !(e instanceof LearnFileError)) {
        throw new LearnFileError('errLearnExercisesInvalid', undefined, e);
      }
      throw e;
    }
  }

  return { subjectName: manifest.subjectName, topic: manifest.topic, summary, exercises };
}

/**
 * Stores a validated package as a NEW topic. The subject is reused when one with the same
 * name exists (otherwise created); a clashing topic name gets " (2)", " (3)", ...
 * If anything fails half-way, everything created so far is removed again.
 */
export async function saveLearnPackage(repo: Repository, pkg: LearnPackage): Promise<Topic> {
  const wanted = pkg.subjectName.trim().toLowerCase();
  let subject = (await repo.listSubjects()).find((s) => s.name.trim().toLowerCase() === wanted);
  const createdSubject = !subject;

  let topic: Topic | undefined;
  try {
    if (!subject) subject = await repo.createSubject(pkg.subjectName);

    const taken = new Set(
      (await repo.listTopics()).filter((t) => t.subjectId === subject!.id).map((t) => t.name.trim().toLowerCase()),
    );
    let name = pkg.topic.name;
    for (let n = 2; taken.has(name.trim().toLowerCase()); n++) name = `${pkg.topic.name} (${n})`;

    topic = await repo.createTopic({ ...pkg.topic, name, subjectId: subject.id });
    const now = Date.now();
    if (pkg.summary) {
      await repo.saveSummary({ ...pkg.summary, topicId: topic.id, createdAt: now, updatedAt: now });
    }
    if (pkg.exercises) {
      await repo.saveExerciseSet({ ...pkg.exercises, topicId: topic.id, version: 1, createdAt: now, updatedAt: now });
    }
    return topic;
  } catch {
    if (topic) await repo.deleteTopic(topic.id).catch(() => undefined);
    if (createdSubject && subject) await repo.deleteSubject(subject.id).catch(() => undefined);
    throw new LearnFileError('errSaveFailed');
  }
}

export async function importLearnFile(repo: Repository, file: File): Promise<Topic> {
  return saveLearnPackage(repo, await readLearnFile(file));
}
