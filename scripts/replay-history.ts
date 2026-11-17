import { z } from 'zod';
import { HISTORY_START, INITIAL_END } from '../src/lib/market/dates';
import { digestSchema, observationKey, type Observation } from '../src/lib/market/schema';
import { parseLabour } from './sources/nbs-labour';
import { parsePmi } from './sources/nbs-pmi';
import { releaseUrls } from './sources/nbs-release';
import { observationsFile, readJson, readOriginal, writeJson } from './storage';

const releaseSchema = z.object({
  suffix: z.string().regex(/^\d{6}\/t\d{8}_\d+\.html$/),
  listedDate: z.iso.date(),
  title: z.string().min(1),
  kind: z.enum(['nbs-labour', 'nbs-pmi']),
});
export const releaseIndexFile = 'data/metadata/releases.json';
export const releaseIndexSchema = z.record(digestSchema, releaseSchema);

export async function replayRelease(hash: string, release: z.infer<typeof releaseSchema>) {
  const original = await readOriginal(hash);
  if (!releaseUrls(release).includes(original.meta.url)) throw new Error(`Unrecognized archived URL: ${hash}`);
  return (release.kind === 'nbs-pmi' ? parsePmi : parseLabour)(original, release);
}

async function replayInitialHistory() {
  const index = releaseIndexSchema.parse(await readJson(releaseIndexFile));
  const observations = new Map<string, Observation>();
  for (const [hash, release] of Object.entries(index)) {
    for (const row of await replayRelease(hash, release)) {
      if (row.observation_period.start < HISTORY_START || row.observation_period.end > INITIAL_END) continue;
      const key = observationKey(row);
      const current = observations.get(key);
      if (current?.publication_date === row.publication_date && current.value !== row.value) {
        throw new Error(`Conflicting same-day rows for ${key}`);
      }
      if (!current || row.publication_date < current.publication_date) observations.set(key, row);
    }
  }
  return [...observations.values()].sort((a, b) => observationKey(a).localeCompare(observationKey(b)));
}

if (process.argv[2] === '--rebuild-initial') {
  void replayInitialHistory().then(async (rows) => {
    await writeJson(observationsFile, rows);
    console.log(`Rebuilt ${rows.length} rows from archived release bodies.`);
  });
}
