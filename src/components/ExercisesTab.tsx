import { useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useRepository } from '../context/RepositoryContext';
import { ExerciseImportError } from '../exercises/errors';
import type { Exercise, ExerciseSetRecord } from '../exercises/model';
import { readExerciseFile } from '../exercises/parse';
import { getDefinition } from '../exercises/registry';
import { useI18n } from '../i18n/I18nProvider';
import type { ProgressRecord } from '../progress/model';
import { applyOutcomes, progressPercent } from '../progress/progress';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { ExerciseSession, type SessionOutcome } from './ExerciseSession';
import { ProgressBar } from './ProgressBar';

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Content of the "Aufgaben" tab: import, overview with progress, and the learning session. */
export function ExercisesTab({ topicId }: { topicId: string }) {
  const repo = useRepository();
  const lib = useLibrary();
  const { t } = useI18n();
  const [set, setSet] = useState<ExerciseSetRecord | null | undefined>(undefined); // undefined = loading
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [session, setSession] = useState<{ exercises: Exercise[]; run: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ProgressRecord | null>(null);
  progressRef.current = progress;

  useEffect(() => {
    let active = true;
    setSet(undefined);
    setProgress(null);
    setSession(null);
    Promise.all([repo.getExerciseSet(topicId), repo.getProgress(topicId)])
      .then(([s, p]) => {
        if (!active) return;
        setSet(s ?? null);
        setProgress(p ?? null);
      })
      .catch(() => {
        if (!active) return;
        setSet(null);
        setError(t('errorStorage'));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, topicId]);

  const playable = useMemo(() => set?.exercises.filter((e) => getDefinition(e.type)) ?? [], [set]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of playable) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    return [...counts.entries()];
  }, [playable]);

  /** Exercises changed, so old answers no longer apply. */
  async function clearProgress() {
    await repo.deleteProgress(topicId);
    setProgress(null);
    await lib.refresh();
  }

  async function handleFiles(files: File[]) {
    setError('');
    setBusy(true);
    try {
      const parsed = await readExerciseFile(files[0]);
      const now = Date.now();
      const next: ExerciseSetRecord = { topicId, version: 1, ...parsed, createdAt: set?.createdAt ?? now, updatedAt: now };
      try {
        await repo.saveExerciseSet(next);
        await clearProgress();
      } catch {
        throw new ExerciseImportError('errSaveFailed');
      }
      setSet(next);
    } catch (e) {
      setError(e instanceof ExerciseImportError ? t(e.key, e.vars) : t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  function start(list: Exercise[]) {
    if (list.length === 0) return;
    setSession((prev) => ({ exercises: shuffle ? shuffled(list) : list, run: (prev?.run ?? 0) + 1 }));
  }

  /** Stores the answers of a session. Progress is a bonus, so failures are ignored. */
  async function record(outcomes: SessionOutcome[], completed: boolean) {
    if (outcomes.length === 0) return;
    const next = applyOutcomes(
      progressRef.current,
      topicId,
      playable.length,
      outcomes.map((o) => ({ exerciseId: o.exercise.id, correct: o.correct })),
      completed,
    );
    setProgress(next);
    try {
      await repo.saveProgress(next);
      await lib.refresh();
    } catch {
      /* ignore */
    }
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length > 0) void handleFiles(files);
      }}
    />
  );

  if (set === undefined) return <p className="muted">{t('loading')}</p>;

  if (set === null) {
    return (
      <>
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) void handleFiles(files);
          }}
        >
          <h3>{busy ? t('importing') : t('exercisesImportTitle')}</h3>
          <p>{t('exercisesImportText')}</p>
          <Button variant="primary" disabled={busy} onClick={() => input.current?.click()}>{t('chooseFile')}</Button>
          <p className="dropzone-hint">{t('exercisesImportHint')}</p>
        </div>
        {error && <p className="field-error center">{error}</p>}
        {fileInput}
      </>
    );
  }

  if (session) {
    return (
      <ExerciseSession
        key={session.run}
        exercises={session.exercises}
        onRestart={start}
        onExit={() => setSession(null)}
        onFinish={(outcomes) => void record(outcomes, true)}
        onQuit={(outcomes) => {
          void record(outcomes, false);
          setSession(null);
        }}
      />
    );
  }

  const count = playable.length;
  const pct = progress ? progressPercent(progress) : null;

  return (
    <div>
      <div className="card exercise-overview">
        <div className="exercise-overview-main">
          <h2>{set.title}</h2>
          <p className="muted">{count === 1 ? t('exerciseCountOne') : t('exerciseCountOther', { count })}</p>
          <div className="chips">
            {typeCounts.map(([type, n]) => {
              const def = getDefinition(type);
              return (
                <span className="chip" key={type}>
                  {n} × {def ? t(def.labelKey) : type}
                </span>
              );
            })}
          </div>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
          <span>{t('shuffleOrder')}</span>
        </label>
        <Button variant="primary" className="btn-large" disabled={count === 0} onClick={() => start(playable)}>
          {t('startLearning')}
        </Button>

        {progress && pct !== null && (
          <div className="overview-progress">
            <div className="overview-progress-head">
              <strong>{t('progress')}</strong>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={pct} />
            <div className="overview-progress-meta">
              <span>{t('progressDetail', { correct: progress.correctIds.length, total: progress.total })}</span>
              {progress.lastRun && (
                <span>{t('lastRun', { score: progress.lastRun.correct, total: progress.lastRun.total })}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="summary-toolbar" style={{ marginTop: 14 }}>
        <div>
          {progress && (
            <Button variant="ghost" onClick={() => setResetting(true)}>{t('resetProgress')}</Button>
          )}
        </div>
        <div className="header-actions">
          <Button disabled={busy} onClick={() => input.current?.click()}>{t('replaceSummary')}</Button>
          <Button variant="ghost" icon="trash" onClick={() => setRemoving(true)}>{t('removeSummary')}</Button>
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}
      {fileInput}

      {removing && (
        <ConfirmDialog
          title={t('removeExercisesTitle')}
          message={t('removeExercisesText')}
          confirmLabel={t('removeSummary')}
          onConfirm={async () => {
            await repo.deleteExerciseSet(topicId);
            await clearProgress();
            setSet(null);
          }}
          onClose={() => setRemoving(false)}
        />
      )}
      {resetting && (
        <ConfirmDialog
          title={t('resetProgress') + '?'}
          message={t('resetProgressText')}
          confirmLabel={t('reset')}
          onConfirm={clearProgress}
          onClose={() => setResetting(false)}
        />
      )}
    </div>
  );
}
