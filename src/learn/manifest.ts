import { DEFAULT_TOPIC_COLOR, DEFAULT_TOPIC_ICON, MAX_NAME_LENGTH } from '../utils/constants';
import { UserFacingError } from '../utils/userError';

/** Errors while reading or writing a `.learn` package. */
export class LearnFileError extends UserFacingError {}

export const LEARN_FORMAT = 'learn-topic';
export const LEARN_FORMAT_VERSION = 1;

export const MANIFEST_FILE = 'manifest.json';
export const EXERCISES_FILE = 'exercises.json';
export const SUMMARY_PDF_FILE = 'summary.pdf';
export const SUMMARY_HTML_FILE = 'summary.html';
export const ASSET_DIR = 'assets/';
const ASSET_FILE = /^assets\/[A-Za-z0-9._-]{1,80}$/;

export function isAllowedEntry(name: string): boolean {
  return (
    [MANIFEST_FILE, EXERCISES_FILE, SUMMARY_PDF_FILE, SUMMARY_HTML_FILE].includes(name) ||
    (ASSET_FILE.test(name) && !name.includes('..'))
  );
}

/** What the manifest.json of a `.learn` file looks like (see docs/LEARN_FORMAT.md). */
export interface LearnManifest {
  format: typeof LEARN_FORMAT;
  formatVersion: number;
  exportedAt: string;
  subject: { name: string };
  topic: { name: string; description: string; icon: string; color: string };
  summary: null | {
    type: 'pdf' | 'html';
    file: string;
    fileName: string;
    assets: { path: string; file: string; mimeType: string }[];
  };
  exercises: null | { file: string };
}

export interface ParsedManifest {
  subjectName: string;
  topic: { name: string; description: string; icon: string; color: string };
  summary: null | { type: 'pdf' | 'html'; file: string; fileName: string; assets: { path: string; file: string }[] };
  exercises: null | { file: string };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function invalid(field: string): never {
  throw new LearnFileError('errLearnFieldInvalid', { field });
}

function text(obj: Record<string, unknown>, field: string, max: number, required: boolean, label = field): string {
  const v = obj[field];
  if (v === undefined || v === null || v === '') {
    if (required) invalid(label);
    return '';
  }
  if (typeof v !== 'string') invalid(label);
  const trimmed = (v as string).trim();
  if (required && trimmed === '') invalid(label);
  if (trimmed.length > max) invalid(label);
  return trimmed;
}

/** Strictly validates untrusted manifest data. Unknown fields are ignored. */
export function parseManifest(raw: unknown): ParsedManifest {
  if (!isObject(raw) || raw.format !== LEARN_FORMAT) throw new LearnFileError('errLearnManifest');

  const version = raw.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) throw new LearnFileError('errLearnManifest');
  if (version > LEARN_FORMAT_VERSION) throw new LearnFileError('errLearnVersion', { version });

  if (!isObject(raw.subject)) invalid('subject');
  if (!isObject(raw.topic)) invalid('topic');
  const subject = raw.subject as Record<string, unknown>;
  const topic = raw.topic as Record<string, unknown>;

  const subjectName = text(subject, 'name', MAX_NAME_LENGTH, true, 'subject.name');
  const name = text(topic, 'name', MAX_NAME_LENGTH, true, 'topic.name');
  const description = text(topic, 'description', 2000, false, 'topic.description');
  const iconRaw = typeof topic.icon === 'string' ? topic.icon.trim() : '';
  const icon = iconRaw !== '' && iconRaw.length <= 16 ? iconRaw : DEFAULT_TOPIC_ICON;
  const color = typeof topic.color === 'string' && /^#[0-9a-f]{6}$/i.test(topic.color) ? topic.color : DEFAULT_TOPIC_COLOR;

  let summary: ParsedManifest['summary'] = null;
  if (raw.summary !== undefined && raw.summary !== null) {
    if (!isObject(raw.summary)) invalid('summary');
    const s = raw.summary as Record<string, unknown>;
    if (s.type !== 'pdf' && s.type !== 'html') invalid('summary.type');
    const type = s.type as 'pdf' | 'html';
    const expectedFile = type === 'pdf' ? SUMMARY_PDF_FILE : SUMMARY_HTML_FILE;
    if (s.file !== expectedFile) invalid('summary.file');
    const fileName = text(s, 'fileName', 255, false, 'summary.fileName') || expectedFile;

    const assets: { path: string; file: string }[] = [];
    if (s.assets !== undefined && s.assets !== null) {
      if (!Array.isArray(s.assets) || s.assets.length > 500 || (type === 'pdf' && s.assets.length > 0)) invalid('summary.assets');
      for (const item of s.assets as unknown[]) {
        if (!isObject(item)) invalid('summary.assets');
        const a = item as Record<string, unknown>;
        const path = text(a, 'path', 300, true, 'summary.assets.path');
        if (typeof a.file !== 'string' || !ASSET_FILE.test(a.file) || a.file.includes('..')) invalid('summary.assets.file');
        assets.push({ path, file: a.file as string });
      }
    }
    summary = { type, file: expectedFile, fileName, assets };
  }

  let exercises: ParsedManifest['exercises'] = null;
  if (raw.exercises !== undefined && raw.exercises !== null) {
    if (!isObject(raw.exercises) || raw.exercises.file !== EXERCISES_FILE) invalid('exercises');
    exercises = { file: EXERCISES_FILE };
  }

  return { subjectName, topic: { name, description, icon, color }, summary, exercises };
}
