import type { Repository } from './repository';
import sampleSummaryHtml from '../../examples/zellaufbau-summary.html?raw';
import sampleExercisesJson from '../../examples/exercises-example.json?raw';
import { parseExerciseSetText } from '../exercises/parse';

const SEEDED_KEY = 'seeded-v1';
const SAMPLE_SUMMARY_KEY = 'sample-summary-v1';
const SAMPLE_EXERCISES_KEY = 'sample-exercises-v1';
let seeding: Promise<void> | null = null;

/** Creates a few sample subjects/topics on the very first start. Runs only once. */
export function seedIfFirstRun(repo: Repository): Promise<void> {
  if (!seeding) {
    seeding = (async () => {
      if (!(await repo.getMeta<boolean>(SEEDED_KEY))) await seedSubjects(repo);
      // Sample content is a bonus; never let it break the app.
      await seedSampleSummary(repo).catch(() => undefined);
      await seedSampleExercises(repo).catch(() => undefined);
    })();
  }
  return seeding;
}

async function seedSubjects(repo: Repository): Promise<void> {
  if ((await repo.listSubjects()).length === 0) {
    const bio = await repo.createSubject('Biologie');
    const math = await repo.createSubject('Mathematik');
    await repo.createTopic({
      subjectId: bio.id,
      name: 'Zellaufbau',
      description: 'Aufbau und Aufgaben der Zellorganellen.',
      icon: '🧬',
      color: '#22c55e',
    });
    await repo.createTopic({
      subjectId: bio.id,
      name: 'Photosynthese',
      description: 'Wie Pflanzen Lichtenergie nutzen.',
      icon: '🌱',
      color: '#14b8a6',
    });
    await repo.createTopic({
      subjectId: math.id,
      name: 'Quadratische Funktionen',
      description: 'Parabeln, Scheitelpunkt und Nullstellen.',
      icon: '📐',
      color: '#8b5cf6',
    });
  }
  await repo.setMeta(SEEDED_KEY, true);
}

/** Adds a sample HTML summary to the "Zellaufbau" topic (also for users who started with Phase 1). */
async function seedSampleSummary(repo: Repository): Promise<void> {
  if (await repo.getMeta<boolean>(SAMPLE_SUMMARY_KEY)) return;
  const topic = (await repo.listTopics()).find((t) => t.name === 'Zellaufbau');
  if (topic && !(await repo.getSummary(topic.id))) {
    const now = Date.now();
    await repo.saveSummary({
      topicId: topic.id,
      type: 'html',
      fileName: 'zellaufbau-summary.html',
      data: new Blob([sampleSummaryHtml], { type: 'text/html;charset=utf-8' }),
      assets: [],
      createdAt: now,
      updatedAt: now,
    });
  }
  await repo.setMeta(SAMPLE_SUMMARY_KEY, true);
}

/** Adds the sample exercises to "Zellaufbau" (also for users who started with an earlier phase). */
async function seedSampleExercises(repo: Repository): Promise<void> {
  if (await repo.getMeta<boolean>(SAMPLE_EXERCISES_KEY)) return;
  const topic = (await repo.listTopics()).find((t) => t.name === 'Zellaufbau');
  if (topic && !(await repo.getExerciseSet(topic.id))) {
    const parsed = parseExerciseSetText(sampleExercisesJson, 'Zellaufbau Aufgaben');
    const now = Date.now();
    await repo.saveExerciseSet({ topicId: topic.id, version: 1, ...parsed, createdAt: now, updatedAt: now });
  }
  await repo.setMeta(SAMPLE_EXERCISES_KEY, true);
}
