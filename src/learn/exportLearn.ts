import { strToU8, zipSync, type Zippable } from 'fflate';
import type { Repository } from '../data/repository';
import {
  ASSET_DIR,
  EXERCISES_FILE,
  LEARN_FORMAT,
  LEARN_FORMAT_VERSION,
  LearnFileError,
  MANIFEST_FILE,
  SUMMARY_HTML_FILE,
  SUMMARY_PDF_FILE,
  type LearnManifest,
} from './manifest';

/** Formats that are already compressed; storing them avoids wasting time. */
const STORED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'woff', 'woff2']);

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  const ext = i < 0 ? '' : name.slice(i + 1).toLowerCase();
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'bin';
}

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Collects a whole topic into ONE `.learn` file (a ZIP archive). */
export async function buildLearnFile(repo: Repository, topicId: string): Promise<{ blob: Blob; fileName: string }> {
  const topic = await repo.getTopic(topicId);
  if (!topic) throw new LearnFileError('topicNotFound');
  const subject = (await repo.listSubjects()).find((s) => s.id === topic.subjectId);
  const [summary, exerciseSet] = await Promise.all([repo.getSummary(topicId), repo.getExerciseSet(topicId)]);

  const files: Zippable = {};

  const manifest: LearnManifest = {
    format: LEARN_FORMAT,
    formatVersion: LEARN_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    subject: { name: subject?.name ?? '' },
    topic: { name: topic.name, description: topic.description, icon: topic.icon, color: topic.color },
    summary: null,
    exercises: null,
  };
  if (!manifest.subject.name) manifest.subject.name = topic.name;

  if (summary) {
    const file = summary.type === 'pdf' ? SUMMARY_PDF_FILE : SUMMARY_HTML_FILE;
    files[file] = [await bytesOf(summary.data), { level: summary.type === 'pdf' ? 0 : 6 }];

    const assets: { path: string; file: string; mimeType: string }[] = [];
    for (const [i, asset] of summary.assets.entries()) {
      const ext = extensionOf(asset.path);
      const entry = `${ASSET_DIR}${String(i + 1).padStart(3, '0')}.${ext}`;
      files[entry] = [await bytesOf(asset.data), { level: STORED_EXTENSIONS.has(ext) ? 0 : 6 }];
      assets.push({ path: asset.path, file: entry, mimeType: asset.mimeType });
    }
    manifest.summary = { type: summary.type, file, fileName: summary.fileName, assets };
  }

  if (exerciseSet) {
    const payload = { version: 1, title: exerciseSet.title, exercises: exerciseSet.exercises };
    files[EXERCISES_FILE] = strToU8(JSON.stringify(payload, null, 2));
    manifest.exercises = { file: EXERCISES_FILE };
  }

  files[MANIFEST_FILE] = strToU8(JSON.stringify(manifest, null, 2));

  const bytes = zipSync(files);
  const base = [subject?.name, topic.name].map((v) => safeFileName(v ?? '')).filter(Boolean).join('_') || 'topic';
  return { blob: new Blob([bytes], { type: 'application/zip' }), fileName: `${base}.learn` };
}
