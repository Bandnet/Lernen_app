import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Summary } from '../types/models';

/** Shows the stored PDF with the browser's built-in viewer (scroll, zoom, search). */
export function PdfViewer({ summary }: { summary: Summary }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    try {
      const objectUrl = URL.createObjectURL(summary.data);
      setUrl(objectUrl);
      setFailed(false);
      return () => URL.revokeObjectURL(objectUrl);
    } catch {
      setFailed(true); // stored data is damaged
    }
  }, [summary.data]);

  if (failed) return <p className="field-error">{t('errViewerFailed')}</p>;
  if (!url) return null;
  return (
    <div className="viewer">
      <iframe className="viewer-frame" src={url} title={summary.fileName} />
      {/* Some mobile browsers cannot render PDFs inline; keep a download fallback. */}
      <a className="viewer-download" href={url} download={summary.fileName}>{t('downloadFile')}</a>
    </div>
  );
}
