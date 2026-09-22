import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MessageDialog } from '../components/MessageDialog';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ExercisesTab } from '../components/ExercisesTab';
import { ProgressBar } from '../components/ProgressBar';
import { SegmentedControl } from '../components/SegmentedControl';
import { SummaryTab } from '../components/SummaryTab';
import { TopicFormModal } from '../components/TopicFormModal';
import { useLibrary } from '../context/LibraryContext';
import { useRepository } from '../context/RepositoryContext';
import { useI18n } from '../i18n/I18nProvider';
import { buildLearnFile } from '../learn/exportLearn';
import { downloadBlob } from '../utils/download';
import { describeError } from '../utils/userError';

type Tab = 'summary' | 'exercises';

export function TopicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const lib = useLibrary();
  const repo = useRepository();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [tab, setTab] = useState<Tab>('summary');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const topic = lib.topics.find((tp) => tp.id === id);
  const subject = lib.subjects.find((s) => s.id === topic?.subjectId);

  async function handleExport() {
    if (!topic) return;
    setExporting(true);
    try {
      const { blob, fileName } = await buildLearnFile(repo, topic.id);
      downloadBlob(blob, fileName);
    } catch (e) {
      setExportError(describeError(e, t));
    } finally {
      setExporting(false);
    }
  }

  if (lib.loading) return <div className="page"><p className="muted">{t('loading')}</p></div>;

  if (!topic) {
    return (
      <div className="page fade-in">
        <EmptyState title={t('topicNotFound')}>
          <Button variant="primary" onClick={() => navigate('/')}>{t('toDashboard')}</Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page fade-in" style={{ ['--tc' as string]: topic.color }}>
      <Link to="/" className="back-link">
        <Icon name="chevronLeft" size={16} /> {t('back')}
      </Link>

      <header className="topic-header">
        <div className="topic-icon large">{topic.icon}</div>
        <div className="topic-header-text">
          <p className="eyebrow">{subject?.name}</p>
          <h1>{topic.name}</h1>
          {topic.description && <p className="muted">{topic.description}</p>}
          {topic.progress !== undefined && (
            <div className="header-progress">
              <ProgressBar value={topic.progress} color={topic.color} />
              <span>{topic.progress}%</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <Button icon="download" disabled={exporting} onClick={handleExport}>{t('exportLearn')}</Button>
          <Button variant="ghost" iconOnly icon="pencil" aria-label={t('edit')} title={t('edit')} onClick={() => setEditing(true)} />
          <Button variant="ghost" iconOnly icon="trash" aria-label={t('delete')} title={t('delete')} onClick={() => setDeleting(true)} />
        </div>
      </header>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'summary', label: t('tabSummary') },
          { value: 'exercises', label: t('tabExercises') },
        ]}
      />

      <div className="tab-panel fade-in" key={tab}>
        {tab === 'summary' ? (
          <SummaryTab topicId={topic.id} />
        ) : (
          <ExercisesTab topicId={topic.id} />
        )}
      </div>

      {exportError && (
        <MessageDialog title={t('exportFailedTitle')} message={exportError} onClose={() => setExportError('')} />
      )}
      {editing && (
        <TopicFormModal
          subjects={lib.subjects}
          topic={topic}
          onSubmit={(values) => lib.updateTopic(topic.id, values)}
          onClose={() => setEditing(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('deleteTopicTitle')}
          message={t('deleteTopicText', { name: topic.name })}
          confirmLabel={t('delete')}
          onConfirm={async () => {
            await lib.deleteTopic(topic.id);
            navigate('/');
          }}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
