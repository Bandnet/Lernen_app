import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { InstallBanner } from '../components/InstallBanner';
import { MessageDialog } from '../components/MessageDialog';
import { SubjectFormModal } from '../components/SubjectFormModal';
import { TopicCard } from '../components/TopicCard';
import { TopicFormModal } from '../components/TopicFormModal';
import { useLibrary } from '../context/LibraryContext';
import { useRepository } from '../context/RepositoryContext';
import { importLearnFile } from '../learn/importLearn';
import { describeError } from '../utils/userError';
import { useI18n } from '../i18n/I18nProvider';
import type { Subject } from '../types/models';

type SubjectModal = { kind: 'create' } | { kind: 'rename'; subject: Subject } | null;
type TopicModal = { defaultSubjectId?: string } | null;

export function DashboardPage() {
  const { t } = useI18n();
  const lib = useLibrary();
  const repo = useRepository();
  const navigate = useNavigate();
  const importInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [subjectModal, setSubjectModal] = useState<SubjectModal>(null);
  const [topicModal, setTopicModal] = useState<TopicModal>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  function openNewTopic(defaultSubjectId?: string) {
    // A topic needs a subject – guide first-time users to create one.
    if (lib.subjects.length === 0) setSubjectModal({ kind: 'create' });
    else setTopicModal({ defaultSubjectId });
  }

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const topic = await importLearnFile(repo, file);
      await lib.refresh();
      navigate(`/topic/${topic.id}`);
    } catch (e) {
      setImportError(describeError(e, t));
    } finally {
      setImporting(false);
    }
  }

  const countLabel = (n: number) => (n === 1 ? t('topicCountOne') : t('topicCountOther', { count: n }));

  return (
    <div className="page fade-in">
      <InstallBanner />
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('welcomeBack')}</p>
          <h1>{t('yourSubjects')}</h1>
        </div>
        <div className="header-actions">
          <Button variant="ghost" iconOnly icon="sliders" aria-label={t('settings')} title={t('settings')} onClick={() => navigate('/settings')} />
          <Button icon="upload" disabled={importing} onClick={() => importInput.current?.click()}>
            {importing ? t('importing') : t('importLearn')}
          </Button>
          <Button icon="plus" onClick={() => setSubjectModal({ kind: 'create' })}>{t('newSubject')}</Button>
          <Button variant="primary" icon="plus" onClick={() => openNewTopic()}>{t('newTopic')}</Button>
        </div>
      </header>

      {lib.loading ? (
        <p className="muted">{t('loading')}</p>
      ) : lib.loadFailed ? (
        <EmptyState title={t('errorGeneric')} text={t('errorStorage')} />
      ) : lib.subjects.length === 0 ? (
        <EmptyState title={t('emptyLibraryTitle')} text={t('emptyLibraryText')}>
          <Button variant="primary" icon="plus" onClick={() => setSubjectModal({ kind: 'create' })}>{t('newSubject')}</Button>
        </EmptyState>
      ) : (
        lib.subjects.map((subject) => {
          const topics = lib.topics.filter((tp) => tp.subjectId === subject.id);
          return (
            <section key={subject.id} className="subject-section">
              <div className="subject-header">
                <div className="subject-title">
                  <h2>{subject.name}</h2>
                  <span className="muted">{countLabel(topics.length)}</span>
                </div>
                <div className="subject-actions">
                  <Button variant="ghost" iconOnly icon="plus" aria-label={t('addTopic')} title={t('addTopic')} onClick={() => openNewTopic(subject.id)} />
                  <Button variant="ghost" iconOnly icon="pencil" aria-label={t('rename')} title={t('rename')} onClick={() => setSubjectModal({ kind: 'rename', subject })} />
                  <Button variant="ghost" iconOnly icon="trash" aria-label={t('delete')} title={t('delete')} onClick={() => setSubjectToDelete(subject)} />
                </div>
              </div>
              {topics.length === 0 ? (
                <p className="muted empty-inline">{t('noTopicsInSubject')}</p>
              ) : (
                <div className="grid">
                  {topics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      <input
        ref={importInput}
        type="file"
        accept=".learn"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleImport(file);
        }}
      />
      {importError && (
        <MessageDialog title={t('importFailedTitle')} message={importError} onClose={() => setImportError('')} />
      )}

      {subjectModal?.kind === 'create' && (
        <SubjectFormModal onSubmit={async (name) => void (await lib.createSubject(name))} onClose={() => setSubjectModal(null)} />
      )}
      {subjectModal?.kind === 'rename' && (
        <SubjectFormModal
          initialName={subjectModal.subject.name}
          onSubmit={(name) => lib.renameSubject(subjectModal.subject.id, name)}
          onClose={() => setSubjectModal(null)}
        />
      )}
      {topicModal && (
        <TopicFormModal
          subjects={lib.subjects}
          defaultSubjectId={topicModal.defaultSubjectId}
          onSubmit={async (values) => void (await lib.createTopic(values))}
          onClose={() => setTopicModal(null)}
        />
      )}
      {subjectToDelete && (
        <ConfirmDialog
          title={t('deleteSubjectTitle')}
          message={t('deleteSubjectText', { name: subjectToDelete.name })}
          confirmLabel={t('delete')}
          onConfirm={() => lib.deleteSubject(subjectToDelete.id)}
          onClose={() => setSubjectToDelete(null)}
        />
      )}
    </div>
  );
}
