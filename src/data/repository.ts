import type { ExerciseSetRecord } from '../exercises/model';
import type { ProgressRecord } from '../progress/model';
import type { Subject, Summary, Topic, TopicInput } from '../types/models';

/**
 * Storage abstraction. The UI only ever talks to this interface, so the
 * IndexedDB implementation can later be swapped for a REST/cloud backend
 * without touching any component.
 */
export interface Repository {
  // Subjects
  listSubjects(): Promise<Subject[]>;
  createSubject(name: string): Promise<Subject>;
  renameSubject(id: string, name: string): Promise<void>;
  /** Deletes the subject and all of its topics. */
  deleteSubject(id: string): Promise<void>;

  // Topics
  listTopics(): Promise<Topic[]>;
  getTopic(id: string): Promise<Topic | undefined>;
  createTopic(input: TopicInput): Promise<Topic>;
  updateTopic(id: string, patch: Partial<Omit<Topic, 'id' | 'createdAt'>>): Promise<void>;
  deleteTopic(id: string): Promise<void>;

  // Summaries (PDF / HTML), one per topic
  getSummary(topicId: string): Promise<Summary | undefined>;
  saveSummary(summary: Summary): Promise<void>;
  deleteSummary(topicId: string): Promise<void>;

  // Exercise sets, one per topic
  getExerciseSet(topicId: string): Promise<ExerciseSetRecord | undefined>;
  saveExerciseSet(set: ExerciseSetRecord): Promise<void>;
  deleteExerciseSet(topicId: string): Promise<void>;

  // Learning progress, one record per topic
  listProgress(): Promise<ProgressRecord[]>;
  getProgress(topicId: string): Promise<ProgressRecord | undefined>;
  saveProgress(record: ProgressRecord): Promise<void>;
  deleteProgress(topicId: string): Promise<void>;

  // Small key/value store (settings, flags)
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta<T>(key: string, value: T): Promise<void>;
}
