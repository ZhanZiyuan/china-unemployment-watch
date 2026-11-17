import { mkdir } from 'node:fs/promises';
import { HISTORY_START, INITIAL_END } from '../src/lib/market/dates';
import { collect } from './sources/collect';
import { observationsFile, storeOriginal, writeJson } from './storage';

async function main() {
  const { originals, observations, failures, releases } = await collect(HISTORY_START, INITIAL_END);
  if (!observations.length) throw new Error('No official observations verified');
  await Promise.all([mkdir('data/raw', { recursive: true }), mkdir('data/metadata', { recursive: true })]);
  for (const hash of new Set(observations.map((o) => o.raw_sha256))) {
    const original = originals.get(hash);
    if (!original) throw new Error(`Missing original: ${hash}`);
    await storeOriginal(original, hash);
  }
  const releaseIndex = Object.fromEntries([...originals.entries()]
    .filter(([hash]) => observations.some((row) => row.raw_sha256 === hash))
    .map(([hash, original]) => {
      const release = releases.find((item) => original.meta.url.endsWith(item.suffix) ||
        (item.suffix === '202302/t20230203_1901737.html' && original.meta.url.includes('/496666/')));
      if (!release) throw new Error(`No archive entry for ${original.meta.url}`);
      return [hash, release];
    }));
  await writeJson('data/metadata/releases.json', releaseIndex);
  await writeJson('data/metadata/initial-backfill.json', {
    requested_start: HISTORY_START,
    requested_end: INITIAL_END,
    completed_at: new Date().toISOString(),
    candidates: releases.length,
    observations: observations.length,
    failures,
  });
  await writeJson(observationsFile, observations);
  console.log(`Verified ${observations.length} observations. Unreadable releases: ${failures.length}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
