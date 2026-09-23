import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Summary } from '../types/models';
import { Button } from './Button';
import { Icon } from './Icon';

// pdfjs only touches the DOM/canvas, so it is imported lazily (see below) and
// never on the server. The worker is bundled by Vite and served from the app
// itself, so rendering works fully offline once the app has been cached.
type PdfjsModule = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfjsModule> | null = null;
function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = 3;

/**
 * Renders the stored PDF page by page on a canvas, so it matches the app's own
 * design (light/dark, accent color, rounded toolbar) instead of the browser's
 * built-in PDF viewer.
 */
export function PdfViewer({ summary }: { summary: Summary }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<import('pdfjs-dist').PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<import('pdfjs-dist').RenderTask | null>(null);
  /** The zoom factor the last fit-width render actually used, so leaving fit mode continues from there instead of resetting to 100%. */
  const fitScaleRef = useRef(1);

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [fitWidth, setFitWidth] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // A stable object URL for the download link only (kept separate from rendering).
  useEffect(() => {
    const url = URL.createObjectURL(summary.data);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [summary.data]);

  // Load the document whenever the summary changes.
  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setPage(1);
    setFitWidth(true);
    setZoomIndex(DEFAULT_ZOOM_INDEX);

    (async () => {
      try {
        const [pdfjs, bytes] = await Promise.all([loadPdfjs(), summary.data.arrayBuffer()]);
        const loadingTask = pdfjs.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        if (cancelled) {
          void loadingTask.destroy();
          return;
        }
        void loadingTaskRef.current?.destroy();
        loadingTaskRef.current = loadingTask;
        docRef.current = doc;
        setPageCount(doc.numPages);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [summary]);

  // Release the document when the viewer unmounts entirely.
  useEffect(
    () => () => {
      renderTaskRef.current?.cancel();
      void loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      docRef.current = null;
    },
    [],
  );

  // Render the current page whenever page/zoom/fit or the container size changes.
  useEffect(() => {
    if (state !== 'ready' || !docRef.current) return;
    let cancelled = false;

    async function render() {
      const doc = docRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!doc || !canvas || !container) return;
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;

      const base = pdfPage.getViewport({ scale: 1 });
      const scale = fitWidth ? (container.clientWidth - 32) / base.width : ZOOM_STEPS[zoomIndex];
      if (fitWidth) fitScaleRef.current = scale;
      const dpr = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale: scale * dpr });

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${Math.ceil(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.ceil(viewport.height / dpr)}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: ctx, viewport, canvas });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch {
        /* a superseded render is cancelled on purpose; ignore */
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, page, zoomIndex, fitWidth]);

  // Re-fit when the panel is resized (e.g. rotating a phone).
  useEffect(() => {
    if (!fitWidth || !containerRef.current) return;
    const observer = new ResizeObserver(() => setPage((p) => p)); // triggers the render effect via a no-op state touch
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [fitWidth]);

  /** Index of the zoom step closest to `scale` (used when leaving fit-width mode). */
  function closestStepIndex(scale: number): number {
    let closest = 0;
    for (let i = 1; i < ZOOM_STEPS.length; i++) {
      if (Math.abs(ZOOM_STEPS[i] - scale) < Math.abs(ZOOM_STEPS[closest] - scale)) closest = i;
    }
    return closest;
  }

  function zoomIn() {
    setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, (fitWidth ? closestStepIndex(fitScaleRef.current) : i) + 1));
    setFitWidth(false);
  }
  function zoomOut() {
    setZoomIndex((i) => Math.max(0, (fitWidth ? closestStepIndex(fitScaleRef.current) : i) - 1));
    setFitWidth(false);
  }

  if (state === 'error') return <p className="field-error">{t('errViewerFailed')}</p>;

  return (
    <div className="viewer">
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-group">
          <Button variant="ghost" iconOnly icon="chevronLeft" aria-label={t('previousPage')} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
          <span className="pdf-page-indicator">{state === 'ready' ? t('pageOf', { current: page, total: pageCount }) : '–'}</span>
          <Button variant="ghost" iconOnly icon="chevronRight" aria-label={t('nextPage')} disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} />
        </div>
        <div className="pdf-toolbar-group">
          <Button variant="ghost" iconOnly icon="minus" aria-label={t('zoomOut')} disabled={!fitWidth && zoomIndex === 0} onClick={zoomOut} />
          <button
            type="button"
            className={`pdf-fit-toggle ${fitWidth ? 'active' : ''}`}
            onClick={() => setFitWidth((f) => !f)}
            title={t('fitWidth')}
          >
            {fitWidth ? t('fitWidth') : `${Math.round(ZOOM_STEPS[zoomIndex] * 100)}%`}
          </button>
          <Button variant="ghost" iconOnly icon="plus" aria-label={t('zoomIn')} disabled={!fitWidth && zoomIndex === ZOOM_STEPS.length - 1} onClick={zoomIn} />
        </div>
        {downloadUrl && (
          <a className="viewer-download" href={downloadUrl} download={summary.fileName} title={t('downloadFile')}>
            <Icon name="download" size={16} />
          </a>
        )}
      </div>

      <div className="pdf-pages" ref={containerRef}>
        {state === 'loading' && <p className="muted pdf-loading">{t('loading')}</p>}
        <canvas ref={canvasRef} className="pdf-canvas" />
      </div>
    </div>
  );
}
