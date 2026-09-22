import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ExerciseSetRecord } from '../exercises/model';
import type { ProgressRecord } from '../progress/model';
import type { Subject, Summary, Topic, TopicInput } from '../types/models';
import type { Repository } from './repository';
import { newId } from '../utils/id';
import { DEFAULT_TOPIC_COLOR, DEFAULT_TOPIC_ICON } from '../utils/constants';

interface LearnDB extends DBSchema {
  subjects: { key: string; value: Subject };
  topics: { key: string; value: Topic; indexes: { bySubject: string } };
  summaries: { key: string; value: Summary };
  exerciseSets: { key: string; value: ExerciseSetRecord };
  progress: { key: string; value: ProgressRecord };
  meta: { key: string; value: unknown };
}

const DB_NAME = 'learn-app';
const DB_VERSION = 4; // bump + add `if (oldVersion < n)` blocks for later phases

export class IndexedDbRepository implements Repository {
  private dbPromise: Promise<IDBPDatabase<LearnDB>>;
  private lastStamp = 0;

  constructor(name: string = DB_NAME) {
    this.dbPromise = openDB<LearnDB>(name, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('subjects', { keyPath: 'id' });
          const topics = db.createObjectStore('topics', { keyPath: 'id' });
          topics.createIndex('bySubject', 'subjectId');
          db.createObjectStore('meta');
        }
        if (oldVersion < 2) {
          db.createObjectStore('summaries', { keyPath: 'topicId' });
        }
        if (oldVersion < 3) {
          db.createObjectStore('exerciseSets', { keyPath: 'topicId' });
        }
        if (oldVersion < 4) {
          db.createObjectStore('progress', { keyPath: 'topicId' });
        }
      },
    });
  }

  /** Strictly increasing timestamps, so items keep their creation order even within one millisecond. */
  private stamp(): number {
    this.lastStamp = Math.max(Date.now(), this.lastStamp + 1);
    return this.lastStamp;
  }

  // ---- Subjects ----------------------------------------------------------

  async listSubjects(): Promise<Subject[]> {
    const db = await this.dbPromise;
    const all = await db.getAll('subjects');
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }

  async createSubject(name: string): Promise<Subject> {
    const db = await this.dbPromise;
    const now = this.stamp();
    const subject: Subject = { id: newId(), name: name.trim(), createdAt: now, updatedAt: now };
    await db.put('subjects', subject);
    return subject;
  }

  async renameSubject(id: string, name: string): Promise<void> {
    const db = await this.dbPromise;
    const subject = await db.get('subjects', id);
    if (!subject) return;
    await db.put('subjects', { ...subject, name: name.trim(), updatedAt: Date.now() });
  }

  async deleteSubject(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['subjects', 'topics', 'summaries', 'exerciseSets', 'progress'], 'readwrite');
    const topicKeys = await tx.objectStore('topics').index('bySubject').getAllKeys(id);
    await Promise.all(
      topicKeys.flatMap((key) => [
        tx.objectStore('topics').delete(key),
        tx.objectStore('summaries').delete(key),
        tx.objectStore('exerciseSets').delete(key),
        tx.objectStore('progress').delete(key),
      ]),
    );
    await tx.objectStore('subjects').delete(id);
    await tx.done;
  }

  // ---- Topics ------------------------------------------------------------

  async listTopics(): Promise<Topic[]> {
    const db = await this.dbPromise;
    const all = await db.getAll('topics');
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }

  async getTopic(id: string): Promise<Topic | undefined> {
    const db = await this.dbPromise;
    return db.get('topics', id);
  }

  async createTopic(input: TopicInput): Promise<Topic> {
    const db = await this.dbPromise;
    const now = this.stamp();
    const topic: Topic = {
      id: newId(),
      subjectId: input.subjectId,
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      icon: input.icon ?? DEFAULT_TOPIC_ICON,
      color: input.color ?? DEFAULT_TOPIC_COLOR,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('topics', topic);
    return topic;
  }

  async updateTopic(id: string, patch: Partial<Omit<Topic, 'id' | 'createdAt'>>): Promise<void> {
    const db = await this.dbPromise;
    const topic = await db.get('topics', id);
    if (!topic) return;
    await db.put('topics', { ...topic, ...patch, updatedAt: Date.now() });
  }

  async deleteTopic(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['topics', 'summaries', 'exerciseSets', 'progress'], 'readwrite');
    await Promise.all([
      tx.objectStore('topics').delete(id),
      tx.objectStore('summaries').delete(id),
      tx.objectStore('exerciseSets').delete(id),
      tx.objectStore('progress').delete(id),
    ]);
    await tx.done;
  }

  // ---- Summaries ---------------------------------------------------------

  async getSummary(topicId: string): Promise<Summary | undefined> {
    const db = await this.dbPromise;
    return db.get('summaries', topicId);
  }

  async saveSummary(summary: Summary): Promise<void> {
    const db = await this.dbPromise;
    await db.put('summaries', summary);
  }

  async deleteSummary(topicId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('summaries', topicId);
  }

  // ---- Exercise sets -----------------------------------------------------

  async getExerciseSet(topicId: string): Promise<ExerciseSetRecord | undefined> {
    const db = await this.dbPromise;
    return db.get('exerciseSets', topicId);
  }

  async saveExerciseSet(set: ExerciseSetRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('exerciseSets', set);
  }

  async deleteExerciseSet(topicId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('exerciseSets', topicId);
  }

  // ---- Progress ----------------------------------------------------------

  async listProgress(): Promise<ProgressRecord[]> {
    const db = await this.dbPromise;
    return db.getAll('progress');
  }

  async getProgress(topicId: string): Promise<ProgressRecord | undefined> {
    const db = await this.dbPromise;
    return db.get('progress', topicId);
  }

  async saveProgress(record: ProgressRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('progress', record);
  }

  async deleteProgress(topicId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('progress', topicId);
  }

  // ---- Meta --------------------------------------------------------------

  async getMeta<T>(key: string): Promise<T | undefined> {
    const db = await this.dbPromise;
    return (await db.get('meta', key)) as T | undefined;
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    const db = await this.dbPromise;
    await db.put('meta', value, key);
  }
}
