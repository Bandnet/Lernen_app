import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { renderMarkdown } from '../summary/markdownRender';
import type { Summary } from '../types/models';

type ViewState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; html: string; missing: string[] };

/** Renders a Markdown summary as sanitized, styled HTML directly in the page (see markdownRender.ts). */
export function MarkdownViewer({ summary }: { summary: Summary }) {
  const { t } = useI18n();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    (async () => {
      try {
        const result = await renderMarkdown(await summary.data.text(), summary.assets);
        if (active) setState({ status: 'ready', html: result.html, missing: result.missing });
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
      <div className="viewer-paper md-paper">
        {/* Content was sanitized with DOMPurify in renderMarkdown() just above. */}
        <div className="md-content" dangerouslySetInnerHTML={{ __html: state.html }} />
      </div>
    </div>
  );
}
