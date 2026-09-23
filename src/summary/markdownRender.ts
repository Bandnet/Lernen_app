import DOMPurify from 'dompurify';
import { Marked } from 'marked';
import type { SummaryAsset } from '../types/models';

const SCHEME_OR_PROTOCOL_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function isLocalReference(url: string): boolean {
  const u = url.trim();
  return u !== '' && !u.startsWith('#') && !SCHEME_OR_PROTOCOL_RELATIVE.test(u);
}

function normalizePath(url: string): string {
  let s = url.trim().split('#')[0].split('?')[0];
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep raw */
  }
  const parts: string[] = [];
  for (const seg of s.replace(/\\/g, '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/').toLowerCase();
}

function displayName(url: string): string {
  const last = url.trim().split('#')[0].split('?')[0].split('/').pop() ?? url;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// A fresh parser instance (not the shared default) so options never leak across callers.
const marked = new Marked({ gfm: true, breaks: false });

export interface MarkdownRenderResult {
  html: string;
  missing: string[];
}

/**
 * Turns Markdown text into safe HTML for direct rendering in the app (no iframe needed):
 *   1. `marked` converts the Markdown to HTML (GitHub-flavoured: tables, strikethrough, task lists)
 *   2. `DOMPurify` strips anything executable — Markdown allows raw inline HTML to pass through,
 *      so a summary could otherwise smuggle in `<script>`, event handlers, `javascript:` links, etc.
 *   3. local image references are resolved against the imported assets and inlined as data: URLs
 */
export async function renderMarkdown(source: string, assets: SummaryAsset[]): Promise<MarkdownRenderResult> {
  const rawHtml = await marked.parse(source);

  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'strong', 'em', 'del', 's', 'u', 'sub', 'sup', 'code', 'pre', 'kbd', 'mark',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img',
      'div', 'span', 'input', // input: only for GFM task-list checkboxes, attrs constrained below
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'type', 'checked', 'disabled', 'align'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'target'], // 'target' is re-added deliberately below, only for safe external links
  });

  const doc = new DOMParser().parseFromString(clean, 'text/html');

  // Belt-and-braces: DOMPurify already blocks javascript:/data:text-html URLs, but re-check
  // explicitly here so a future DOMPurify config change can't silently regress this.
  doc.querySelectorAll('a[href], img[src]').forEach((el) => {
    const attr = el.tagName === 'A' ? 'href' : 'src';
    const value = el.getAttribute(attr) ?? '';
    if (/^\s*(javascript|vbscript|data:text\/html)/i.test(value)) el.removeAttribute(attr);
  });

  // Task-list checkboxes stay inert; anything else typed as an <input> is dropped.
  doc.querySelectorAll('input').forEach((el) => {
    if (el.getAttribute('type') !== 'checkbox') el.remove();
    else {
      el.setAttribute('disabled', '');
      el.removeAttribute('onclick');
    }
  });

  // External links open in a new tab safely; local anchors are left as-is.
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = (a.getAttribute('href') ?? '').trim();
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    } else if (!href.startsWith('#')) {
      a.removeAttribute('href'); // no relative-page navigation inside a summary
    }
  });

  // Resolve local images (siblings selected together with the .md file) to data: URLs.
  const byPath = new Map<string, SummaryAsset>();
  const byName = new Map<string, SummaryAsset>();
  for (const asset of assets) {
    const n = normalizePath(asset.path);
    byPath.set(n, asset);
    const base = n.split('/').pop() ?? n;
    if (!byName.has(base)) byName.set(base, asset);
  }

  const missing = new Set<string>();
  const jobs: Promise<void>[] = [];
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    if (!isLocalReference(src)) return;
    const n = normalizePath(src);
    const asset = byPath.get(n) ?? byName.get(n.split('/').pop() ?? n);
    if (!asset) {
      missing.add(displayName(src));
      img.removeAttribute('src');
      return;
    }
    jobs.push(blobToDataUrl(asset.data).then((dataUrl) => img.setAttribute('src', dataUrl)));
  });
  await Promise.all(jobs);

  return { html: doc.body.innerHTML, missing: [...missing] };
}
