import { useEffect, useRef, useState } from 'react';
import { useRepository } from '../context/RepositoryContext';
import { useI18n } from '../i18n/I18nProvider';
import { readSummaryFiles, SUMMARY_ACCEPT, SummaryImportError } from '../summary/importSummary';
import type { Summary } from '../types/models';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { HtmlViewer } from './HtmlViewer';
import { PdfViewer } from './PdfViewer';
import { SummaryDropzone } from './SummaryDropzone';

/** Content of the "Zusammenfassung" tab: import, view, replace and remove a summary. */
export function SummaryTab({ topicId }: { topicId: string }) {
  const repo = useRepository();
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setSummary(undefined);
    repo
      .getSummary(topicId)
      .then((s) => active && setSummary(s ?? null))
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setError(t('errorStorage'));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, topicId]);

  async function handleFiles(files: File[]) {
    setError('');
    setBusy(true);
    try {
      const parsed = await readSummaryFiles(files);
      const now = Date.now();
      const next: Summary = { ...parsed, topicId, createdAt: summary?.createdAt ?? now, updatedAt: now };
      try {
        await repo.saveSummary(next);
      } catch {
        throw new SummaryImportError('errSaveFailed');
      }
      // Ask the browser not to evict our data under storage pressure (best effort).
      void navigator.storage?.persist?.()?.catch(() => undefined);
      setSummary(next);
    } catch (e) {
      setError(e instanceof SummaryImportError ? t(e.key, e.vars) : t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  if (summary === undefined) return <p className="muted">{t('loading')}</p>;

  if (summary === null) {
    return (
      <>
        <SummaryDropzone busy={busy} onFiles={handleFiles} />
        {error && <p className="field-error center">{error}</p>}
      </>
    );
  }

  return (
    <div>
      <div className="summary-toolbar">
        <div className="summary-file">
          <span className="badge">{summary.type.toUpperCase()}</span>
          <span className="summary-file-name">{summary.fileName}</span>
        </div>
        <div className="header-actions">
          <Button disabled={busy} onClick={() => replaceInput.current?.click()}>{t('replaceSummary')}</Button>
          <Button variant="ghost" icon="trash" onClick={() => setRemoving(true)}>{t('removeSummary')}</Button>
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}

      {summary.type === 'pdf' ? <PdfViewer summary={summary} /> : <HtmlViewer summary={summary} />}

      <input
        ref={replaceInput}
        type="file"
        multiple
        hidden
        accept={SUMMARY_ACCEPT}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) void handleFiles(files);
        }}
      />

      {removing && (
        <ConfirmDialog
          title={t('removeSummaryTitle')}
          message={t('removeSummaryText', { name: summary.fileName })}
          confirmLabel={t('removeSummary')}
          onConfirm={async () => {
            await repo.deleteSummary(topicId);
            setSummary(null);
          }}
          onClose={() => setRemoving(false)}
        />
      )}
    </div>
  );
}
