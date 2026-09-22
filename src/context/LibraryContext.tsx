import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Repository } from '../data/repository';
import { seedIfFirstRun } from '../data/seed';
import type { ProgressRecord } from '../progress/model';
import { progressPercent } from '../progress/progress';
import type { Subject, Topic, TopicInput } from '../types/models';

interface LibraryValue {
  subjects: Subject[];
  topics: Topic[];
  loading: boolean;
  loadFailed: boolean;
  /** Re-reads everything from storage (e.g. after progress changed). */
  refresh: () => Promise<void>;
  createSubject: (name: string) => Promise<Subject>;
  renameSubject: (id: string, name: string) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  createTopic: (input: TopicInput) => Promise<Topic>;
  updateTopic: (id: string, patch: Partial<Omit<Topic, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

/** Holds subjects + topics in memory and keeps them in sync with the repository. */
export function LibraryProvider({ repository, children }: { repository: Repository; children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rawTopics, setRawTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(async () => {
    const [s, t, p] = await Promise.all([
      repository.listSubjects(),
      repository.listTopics(),
      repository.listProgress(),
    ]);
    // Ignore damaged records instead of letting them break the whole app.
    const validSubjects = s.filter((x) => typeof x?.id === 'string' && typeof x.name === 'string');
    const validIds = new Set(validSubjects.map((x) => x.id));
    setSubjects(validSubjects);
    setRawTopics(
      t.filter((x) => typeof x?.id === 'string' && typeof x.name === 'string' && validIds.has(x.subjectId)),
    );
    setProgress(p.filter((x) => typeof x?.topicId === 'string' && Array.isArray(x.correctIds)));
  }, [repository]);

  useEffect(() => {
    let active = true;
    seedIfFirstRun(repository)
      .then(reload)
      .catch(() => active && setLoadFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [repository, reload]);

  // Topics enriched with their learning progress (only once something was answered).
  const topics = useMemo(() => {
    const byTopic = new Map(progress.map((p) => [p.topicId, p]));
    return rawTopics.map((topic) => {
      const record = byTopic.get(topic.id);
      return record ? { ...topic, progress: progressPercent(record) } : topic;
    });
  }, [rawTopics, progress]);

  const value = useMemo<LibraryValue>(
    () => ({
      subjects,
      topics,
      loading,
      loadFailed,
      refresh: reload,
      async createSubject(name) {
        const subject = await repository.createSubject(name);
        await reload();
        return subject;
      },
      async renameSubject(id, name) {
        await repository.renameSubject(id, name);
        await reload();
      },
      async deleteSubject(id) {
        await repository.deleteSubject(id);
        await reload();
      },
      async createTopic(input) {
        const topic = await repository.createTopic(input);
        await reload();
        return topic;
      },
      async updateTopic(id, patch) {
        await repository.updateTopic(id, patch);
        await reload();
      },
      async deleteTopic(id) {
        await repository.deleteTopic(id);
        await reload();
      },
    }),
    [subjects, topics, loading, loadFailed, repository, reload],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
