import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { buildSandboxedHtml } from '../summary/htmlSandbox';
import type { Summary } from '../types/models';

type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; srcDoc: string; missing: string[] };

/** Renders an uploaded HTML summary inside a sandboxed iframe (no scripts, no same-origin access). */
export function HtmlViewer({ summary }: { summary: Summary }) {
  const { t } = useI18n();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    (async () => {
      try {
        const result = await buildSandboxedHtml(await summary.data.text(), summary.assets);
        if (active) setState({ status: 'ready', srcDoc: result.html, missing: result.missing });
      } catch {
        if (active) setState({ status: 'error' });
      }
    })();
    return () => {
      active = false;
    };
  }, [summary]);

  if (state.status === 'loading') return <p className="muted">{t('loading')}</p>;
  if (state.status === 'error') return <p className="field-error">{t('errViewerFailed')}</p>;

  return (
    <div className="viewer">
      {state.missing.length > 0 && (
        <div className="notice">{t('missingAssets', { files: state.missing.join(', ') })}</div>
      )}
      <div className="viewer-paper">
        <iframe
          className="viewer-frame"
          title={summary.fileName}
          srcDoc={state.srcDoc}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
