import { mkdir } from 'node:fs/promises';
import { businessDate, HISTORY_START, INITIAL_END, shanghaiTimestamp, shiftMonth } from '../src/lib/market/dates';
import { datasetSchema, healthSchema, type Health } from '../src/lib/market/schema';
import { collect } from './sources/collect';
import type { ResponseMetadata } from './sources/http';
import { cutoffForRun } from './sources/nbs-release';
import { parseSectorPmi } from './sources/nbs-pmi';
import { releaseSignature } from './research/observations';
import { latestFile, healthFile, preparePublication, publish } from './publish';
import { mergeObservations, readRevisions, revisionFile } from './quality';
import { releaseIndexFile, releaseIndexSchema } from './replay-history';
import { observationsFile, observationsSchema, readOptionalJson, readOriginal, storeOriginal, writeJson } from './storage';

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--backfill', '--from-archive'].includes(arg)) || args.length > 1) {
    throw new Error('Usage: pnpm fetch-data [--backfill | --from-archive]');
  }
  const start = new Date();
  const attempted_at = start.toISOString();
  const now = businessDate(start);
  const existing = await readOptionalJson(latestFile);
  const previous = existing === undefined ? null : datasetSchema.parse(existing);
  const prev = observationsSchema.parse(await readOptionalJson(observationsFile) ?? []);
  const oldRevisions = await readRevisions();
  if (args.includes('--from-archive')) {
    const asOf = prev.reduce((end, row) => row.observation_period.end > end ? row.observation_period.end : end, INITIAL_END);
    const prepared = await preparePublication(prev, oldRevisions, asOf);
    if (prepared.changed) await publish(prepared.dataset);
    return;
  }

  const backfill = args.includes('--backfill') || !prev.length;
  const lookback = shiftMonth(now, -4);
  const cutoff = cutoffForRun(start, backfill, INITIAL_END);
  const report = `data/runs/${attempted_at.replace(/:/g, '-')}.json`;
  const workflow_url = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;
  const status: Health['source_status'] = { 'nbs-labour': 'retained', 'nbs-pmi': 'retained' };
  let result: Health['result'] = 'fetch_failed';
  let version = previous?.dataset_version ?? null;
  let details: unknown = null;
  try {
    const collected = await collect(backfill ? HISTORY_START : lookback, cutoff, undefined, backfill ? 'earliest' : 'latest');
    details = collected.failures;
    for (const source of ['nbs-labour', 'nbs-pmi'] as const) {
      const failed = collected.failures.some((item) =>
        item.source_id === source && (!backfill || item.release.listedDate >= shiftMonth(cutoff, -4)));
      const received = collected.observations.some((row) => row.source_id === source);
      status[source] = failed || !received ? 'fetch_failed' : 'verified';
    }
    if (Object.values(status).includes('fetch_failed')) throw new Error('Required source collection failed');
    result = 'invalid';
    const index = releaseIndexSchema.parse(await readOptionalJson(releaseIndexFile) ?? {});
    const canonical = new Map<string, ResponseMetadata>();
    const incoming = [];
    for (const row of collected.observations) {
      if (!(row.raw_sha256 in index)) {
        incoming.push(row);
        continue;
      }
      const meta = canonical.get(row.raw_sha256) ?? (await readOriginal(row.raw_sha256)).meta;
      canonical.set(row.raw_sha256, meta);
      incoming.push({ ...row, source_url: meta.url, fetched_at: meta.fetched_at });
    }
    const { rows, revisions } = mergeObservations(prev, incoming, backfill ? '9999-12-31' : lookback);
    await Promise.all([mkdir('data/raw', { recursive: true }), mkdir('data/metadata', { recursive: true })]);
    const accepted = [...new Set(rows.map((row) => row.raw_sha256))].filter((hash) => !(hash in index));
    if (!backfill) {
      // Preserve sector-only revisions from a PMI release even when its core columns have not changed.
      for (const [hash, release] of collected.originalsByRelease) {
        if (release.kind !== 'nbs-pmi' || hash in index || accepted.includes(hash)) continue;
        const original = collected.originals.get(hash);
        if (!original) continue;
        const sectors = parseSectorPmi(original, release).filter((row) => row.observation_period.end <= cutoff);
        if (!sectors.length) continue;
        const archived = await Promise.all(Object.entries(index).filter(([, item]) => item.suffix === release.suffix)
          .map(async ([id, item]) => ({ original: await readOriginal(id), item })));
        const latest = archived.sort((a, b) => b.original.meta.fetched_at.localeCompare(a.original.meta.fetched_at))[0];
        if (!latest || releaseSignature(sectors) !== releaseSignature(parseSectorPmi(latest.original, latest.item))) accepted.push(hash);
      }
    }
    for (const hash of accepted) {
      const original = collected.originals.get(hash);
      const release = collected.originalsByRelease.get(hash);
      if (!original || !release) throw new Error(`Missing collected evidence for ${hash}`);
      await storeOriginal(original, hash);
      index[hash] = release;
    }
    if (accepted.length) await writeJson(releaseIndexFile, index);
    const allRevisions = [...oldRevisions, ...revisions];
    const prepared = await preparePublication(rows, allRevisions, now);
    if (prepared.changed) {
      await writeJson(observationsFile, rows);
      await writeJson(revisionFile, allRevisions);
      await publish(prepared.dataset);
    }
    version = prepared.dataset.dataset_version;
    result = 'success';
  } catch (error) {
    if (result === 'invalid') {
      status['nbs-labour'] = 'invalid';
      status['nbs-pmi'] = 'invalid';
    } else if (Object.values(status).every((value) => value === 'retained')) {
      status['nbs-labour'] = 'fetch_failed';
      status['nbs-pmi'] = 'fetch_failed';
    }
    details = { releases: details, error: error instanceof Error ? error.message : String(error) };
    console.error(details);
    process.exitCode = 1;
  }
  const health = healthSchema.parse({
    attempted_at,
    completed_at: new Date().toISOString(),
    attempted_at_shanghai: shanghaiTimestamp(attempted_at),
    dataset_version: version,
    result,
    source_status: status,
    workflow_url,
  });
  await writeJson(report, { ...health, cutoff, details });
  await writeJson(healthFile, health);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
