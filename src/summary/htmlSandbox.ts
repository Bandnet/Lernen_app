import type { SummaryAsset } from '../types/models';

/**
 * Turns an uploaded HTML document into a safe, self-contained document for a
 * sandboxed <iframe srcdoc>. Defence in depth:
 *   1. the iframe itself is sandboxed without `allow-scripts` / `allow-same-origin`
 *   2. scripts, frames, plugins, inline event handlers and javascript: URLs are removed here
 *   3. a strict Content-Security-Policy is injected (no scripts, no network except https images)
 *   4. local images / CSS / fonts are inlined as data: URLs from the stored assets
 */

const CSP =
  "default-src 'none'; img-src data: blob: https:; style-src 'unsafe-inline'; font-src data:; media-src data:";

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

type Lookup = (url: string) => Promise<string | null>;

async function rewriteCssUrls(css: string, lookup: Lookup): Promise<string> {
  const matches = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)];
  const replacements = await Promise.all(matches.map((m) => lookup(m[2])));
  let out = '';
  let last = 0;
  matches.forEach((m, i) => {
    const start = m.index ?? 0;
    out += css.slice(last, start);
    out += replacements[i] ? `url("${replacements[i]}")` : m[0];
    last = start + m[0].length;
  });
  return out + css.slice(last);
}

export interface SandboxResult {
  html: string;
  /** Local files the HTML refers to that were not provided at import. */
  missing: string[];
}

export async function buildSandboxedHtml(source: string, assets: SummaryAsset[]): Promise<SandboxResult> {
  const doc = new DOMParser().parseFromString(source, 'text/html');

  // ---- asset lookup ------------------------------------------------------
  const byPath = new Map<string, SummaryAsset>();
  const byName = new Map<string, SummaryAsset>();
  for (const asset of assets) {
    const n = normalizePath(asset.path);
    byPath.set(n, asset);
    const base = n.split('/').pop() ?? n;
    if (!byName.has(base)) byName.set(base, asset);
  }
  const find = (url: string) => {
    const n = normalizePath(url);
    return byPath.get(n) ?? byName.get(n.split('/').pop() ?? n);
  };

  const missing = new Set<string>();
  const dataUrlCache = new Map<SummaryAsset, Promise<string>>();
  const toDataUrl: Lookup = async (url) => {
    if (!isLocalReference(url)) return null;
    const asset = find(url);
    if (!asset) {
      missing.add(displayName(url));
      return null;
    }
    let pending = dataUrlCache.get(asset);
    if (!pending) {
      pending = blobToDataUrl(asset.data);
      dataUrlCache.set(asset, pending);
    }
    return pending;
  };

  // ---- 1. remove anything active ----------------------------------------
  doc
    .querySelectorAll('script, iframe, frame, frameset, object, embed, applet, base, meta[http-equiv]')
    .forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (
        ['href', 'src', 'xlink:href', 'action', 'formaction', 'srcdoc', 'poster', 'data'].includes(name) &&
        /^\s*(javascript|vbscript|data:text\/html)/i.test(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // ---- 2. links: only in-page anchors and http(s)/mailto/tel ------------
  doc.querySelectorAll('a[href], area[href]').forEach((a) => {
    const href = (a.getAttribute('href') ?? '').trim();
    if (href.startsWith('#')) return;
    if (/^(https?:|mailto:|tel:)/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    } else {
      a.removeAttribute('href');
    }
  });

  // ---- 3. inline local resources ----------------------------------------
  doc.querySelectorAll('[srcset]').forEach((el) => el.removeAttribute('srcset'));

  const jobs: Promise<void>[] = [];

  doc.querySelectorAll('img[src], source[src], audio[src], video[src], input[src]').forEach((el) => {
    const src = el.getAttribute('src') ?? '';
    if (!isLocalReference(src)) return;
    jobs.push(
      toDataUrl(src).then((d) => {
        if (d) el.setAttribute('src', d);
        else el.removeAttribute('src');
      }),
    );
  });

  doc.querySelectorAll('video[poster]').forEach((el) => {
    const poster = el.getAttribute('poster') ?? '';
    if (!isLocalReference(poster)) return;
    jobs.push(
      toDataUrl(poster).then((d) => {
        if (d) el.setAttribute('poster', d);
        else el.removeAttribute('poster');
      }),
    );
  });

  doc.querySelectorAll('link').forEach((link) => {
    const rel = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
    const href = link.getAttribute('href') ?? '';
    if (!rel.includes('stylesheet') || !isLocalReference(href)) {
      link.remove(); // remote CSS would be blocked by the CSP anyway
      return;
    }
    jobs.push(
      (async () => {
        const asset = find(href);
        if (!asset) {
          missing.add(displayName(href));
          link.remove();
          return;
        }
        const style = doc.createElement('style');
        style.textContent = await rewriteCssUrls(await asset.data.text(), toDataUrl);
        link.replaceWith(style);
      })(),
    );
  });

  doc.querySelectorAll('style').forEach((style) => {
    const css = style.textContent ?? '';
    if (css.includes('url(')) {
      jobs.push(rewriteCssUrls(css, toDataUrl).then((out) => void (style.textContent = out)));
    }
  });

  doc.querySelectorAll('[style*="url("]').forEach((el) => {
    jobs.push(rewriteCssUrls(el.getAttribute('style') ?? '', toDataUrl).then((out) => el.setAttribute('style', out)));
  });

  await Promise.all(jobs);

  // ---- 4. CSP + keep the page light so it always looks like the original -
  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', CSP);
  const scheme = doc.createElement('meta');
  scheme.setAttribute('name', 'color-scheme');
  scheme.setAttribute('content', 'light');
  doc.head.prepend(csp, scheme);

  return { html: `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`, missing: [...missing] };
}
