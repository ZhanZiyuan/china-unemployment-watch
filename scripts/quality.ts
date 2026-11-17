import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { businessDate, dayNumber, endOfMonth, HISTORY_START, shiftMonth } from '../src/lib/market/dates';
import { definitions, digestSchema, observationKey, observationSchema, type Dataset, type Observation, type SeriesId } from '../src/lib/market/schema';
import { replayRelease, releaseIndexFile, releaseIndexSchema } from './replay-history';
import { readJson, readOptionalJson } from './storage';
import { sha256 } from './sources/http';

export const revisionFile = 'data/revisions/observations.json';
export const revisionSchema = z.object({
  revision_id: digestSchema,
  previous: observationSchema,
  current: observationSchema,
}).strict();
export type Revision = z.infer<typeof revisionSchema>;

export function uniqueRows(rows: Observation[]) {
  const result = new Map<string, Observation>();
  for (const row of rows) {
    const key = observationKey(row);
    if (result.has(key)) throw new Error(`Duplicate observation: ${key}`);
    result.set(key, row);
  }
  return result;
}

export function mergeObservations(previous: Observation[], incoming: Observation[], allowRevisionSince: string) {
  const rows = uniqueRows(previous);
  const revisions: Revision[] = [];
  for (const [key, row] of uniqueRows(incoming)) {
    const old = rows.get(key);
    if (!old) {
      rows.set(key, row);
      continue;
    }
    if (old.value === row.value || row.observation_period.start < allowRevisionSince ||
        row.publication_date < old.publication_date || row.fetched_at <= old.fetched_at) continue;
    const revision_id = sha256(JSON.stringify([old, row]));
    const current = observationSchema.parse({ ...row, revision_id, status: 'revised' });
    revisions.push({ revision_id, previous: old, current });
    rows.set(key, current);
  }
  return { rows: [...rows.values()].sort((a, b) => observationKey(a).localeCompare(observationKey(b))), revisions };
}

const thresholds: Record<SeriesId, { jump: number; stale: number }> = {
  urban_unemployment: { jump: 0.9, stale: 80 },
  city_unemployment: { jump: 1.2, stale: 80 },
  manufacturing_pmi_employment: { jump: 4, stale: 50 },
  nonmanufacturing_pmi_employment: { jump: 5, stale: 50 },
};

export function profile(records: Observation[], asOf: string, enforceFreshness = true) {
  uniqueRows(records);
  const coverage: Dataset['coverage'] = [];
  const quality_flags: Dataset['quality_flags'] = [];
  for (const series_id of Object.keys(definitions) as SeriesId[]) {
    const rows = records.filter((row) => row.series_id === series_id && row.value !== null)
      .sort((a, b) => a.observation_period.end.localeCompare(b.observation_period.end));
    const last = rows.at(-1)?.observation_period.end ?? null;
    if (!last || new Set(rows.map((row) => row.value)).size < 2) {
      throw new Error(`Missing or zero-variance required series: ${series_id}`);
    }
    const { stale, jump } = thresholds[series_id];
    if (enforceFreshness && dayNumber(asOf) - dayNumber(last) > stale * 86_400_000) {
      throw new Error(`Required series is stale: ${series_id} (${last})`);
    }
    const months = new Set(rows.map((row) => row.observation_period.start));
    const missing = [];
    for (let start = HISTORY_START; start < last; start = shiftMonth(start, 1)) {
      if (!months.has(start)) missing.push({ start, end: endOfMonth(start) });
    }
    for (let i = 1; i < rows.length; i += 1) {
      if (shiftMonth(rows[i - 1].observation_period.start, 1) === rows[i].observation_period.start &&
          Math.abs(Number(rows[i].value) - Number(rows[i - 1].value)) >= jump) {
        quality_flags.push({ series_id, period_end: rows[i].observation_period.end, code: 'unusual_change' });
      }
    }
    const nextStart = shiftMonth(last, 1);
    coverage.push({
      series_id,
      first: rows[0].observation_period.start,
      last,
      available: rows.length,
      fetched_at: rows.map((row) => row.fetched_at).sort().at(-1) ?? null,
      missing,
      not_yet_published: nextStart <= asOf ? { start: nextStart, end: endOfMonth(asOf) } : null,
    });
  }
  return { coverage, quality_flags };
}

export async function validateEvidence(records: Observation[], revisions: Revision[]) {
  const index = releaseIndexSchema.parse(await readJson(releaseIndexFile));
  const raw = new Map<string, Observation[]>();
  const revisionById = new Map(revisions.map((row) => [row.revision_id, row]));
  if (revisionById.size !== revisions.length) throw new Error('Duplicate revision ID');
  for (const revised of revisions) {
    const { current, previous, revision_id } = revised;
    const input = { ...current, revision_id: null, status: current.value === 0 ? 'zero' : 'observed' };
    if (revision_id !== sha256(JSON.stringify([previous, input])) || current.revision_id !== revision_id ||
        observationKey(previous) !== observationKey(current) || previous.value === current.value) {
      throw new Error(`Invalid revision chain: ${revision_id}`);
    }
  }
  for (const row of [...records, ...revisions.flatMap((entry) => [entry.previous, entry.current])]) {
    if (row.revision_id && !isDeepStrictEqual(revisionById.get(row.revision_id)?.current, row)) {
      throw new Error(`Missing matching revision record: ${row.revision_id}`);
    }
    const hash = row.raw_sha256;
    const release = index[hash];
    if (!release) throw new Error(`Missing release entry: ${hash}`);
    const original = raw.get(hash) ?? await replayRelease(hash, release);
    raw.set(hash, original);
    const archived = original.find((candidate) => observationKey(candidate) === observationKey(row));
    const normalized = { ...row, status: row.value === 0 ? 'zero' : 'observed', revision_id: null };
    if (!isDeepStrictEqual(archived, normalized)) {
      throw new Error(`Observation does not reproduce from the original body: ${observationKey(row)}`);
    }
    if (row.observation_period.end > businessDate(row.fetched_at)) {
      throw new Error(`Unfinished period: ${observationKey(row)}`);
    }
  }
}

export async function readRevisions() {
  return z.array(revisionSchema).parse(await readOptionalJson(revisionFile) ?? []);
}
