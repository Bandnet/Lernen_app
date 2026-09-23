import type { Summary, SummaryAsset } from '../types/models';
import { UserFacingError } from '../utils/userError';

/** Thrown for problems the user can understand and fix. */
export class SummaryImportError extends UserFacingError {}

const MB = 1024 * 1024;
export const LIMITS = { pdf: 50 * MB, html: 10 * MB, markdown: 10 * MB, assets: 40 * MB };

const ASSET_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  css: 'text/css',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

const PRIMARY_EXTENSIONS = ['pdf', 'html', 'htm', 'md', 'markdown'];

export const SUMMARY_ACCEPT = [
  '.pdf',
  '.html',
  '.htm',
  '.md',
  '.markdown',
  ...Object.keys(ASSET_MIME).map((e) => `.${e}`),
].join(',');

export type ParsedSummary = Pick<Summary, 'type' | 'fileName' | 'data' | 'assets'>;

function extension(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

function decodeText(bytes: Uint8Array): string {
  // Honour a declared charset (e.g. windows-1252) but fall back to UTF-8.
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 2048));
  const declared = /charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(declared).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export interface SummaryInputFile {
  name: string;
  /** Path as referenced by the HTML/Markdown (defaults to the name). */
  path?: string;
  blob: Blob;
}

/** Collects the extra images/CSS/fonts alongside the main file (shared by HTML and Markdown). */
async function collectAssets(files: SummaryInputFile[], main: SummaryInputFile): Promise<SummaryAsset[]> {
  const assets: SummaryAsset[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const file of files) {
    if (file === main) continue;
    const mime = ASSET_MIME[extension(file.name)];
    if (!mime) continue; // silently ignore unsupported extras
    const path = file.path || file.name;
    if (seen.has(path.toLowerCase())) continue;
    seen.add(path.toLowerCase());
    total += file.blob.size;
    if (total > LIMITS.assets) throw new SummaryImportError('errAssetsTooLarge', { max: LIMITS.assets / MB });
    assets.push({ path, mimeType: mime, data: file.blob.slice(0, file.blob.size, mime) });
  }
  return assets;
}

/** Validates files chosen in the browser. */
export function readSummaryFiles(files: File[]): Promise<ParsedSummary> {
  return buildSummary(
    files.map((f) => ({
      name: f.name,
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      blob: f,
    })),
  );
}

/**
 * Validates the given files and turns them into a summary (without topicId/timestamps).
 * Accepts exactly one PDF, HTML or Markdown file; for HTML/Markdown, any additional
 * images/CSS/fonts are kept as assets so the page can be displayed completely offline.
 * Also used when importing `.learn` packages, so both paths share the same checks.
 */
export async function buildSummary(files: SummaryInputFile[]): Promise<ParsedSummary> {
  const primaries = files.filter((f) => PRIMARY_EXTENSIONS.includes(extension(f.name)));
  if (primaries.length === 0) throw new SummaryImportError('errNoSupportedFile');
  if (primaries.length > 1) throw new SummaryImportError('errMultiplePrimary');

  const main = primaries[0];
  if (main.blob.size === 0) throw new SummaryImportError('errEmptyFile');
  const ext = extension(main.name);

  if (ext === 'pdf') {
    if (main.blob.size > LIMITS.pdf) throw new SummaryImportError('errFileTooLarge', { max: LIMITS.pdf / MB });
    const head = new TextDecoder('latin1').decode(new Uint8Array(await main.blob.slice(0, 1024).arrayBuffer()));
    if (!head.includes('%PDF-')) throw new SummaryImportError('errPdfInvalid');
    return {
      type: 'pdf',
      fileName: main.name,
      data: main.blob.slice(0, main.blob.size, 'application/pdf'),
      assets: [],
    };
  }

  if (ext === 'md' || ext === 'markdown') {
    if (main.blob.size > LIMITS.markdown) throw new SummaryImportError('errFileTooLarge', { max: LIMITS.markdown / MB });
    const text = decodeText(new Uint8Array(await main.blob.arrayBuffer()));
    if (text.includes('\u0000')) throw new SummaryImportError('errMarkdownInvalid');
    return {
      type: 'markdown',
      fileName: main.name,
      data: new Blob([text], { type: 'text/markdown;charset=utf-8' }),
      assets: await collectAssets(files, main),
    };
  }

  // HTML
  if (main.blob.size > LIMITS.html) throw new SummaryImportError('errFileTooLarge', { max: LIMITS.html / MB });
  const text = decodeText(new Uint8Array(await main.blob.arrayBuffer()));
  const looksLikeHtml = /<\s*(html|body|head|p|div|h[1-6]|span|table|ul|ol|img|a|section|article|main|style)[\s>/]/i.test(text);
  if (text.includes('\u0000') || !looksLikeHtml) throw new SummaryImportError('errHtmlInvalid');

  return {
    type: 'html',
    fileName: main.name,
    data: new Blob([text], { type: 'text/html;charset=utf-8' }),
    assets: await collectAssets(files, main),
  };
}
