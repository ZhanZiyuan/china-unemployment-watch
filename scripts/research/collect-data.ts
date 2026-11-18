import { mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { businessDate, HISTORY_START, INITIAL_END, shiftMonth } from '../../src/lib/market/dates';
import { digestSchema, researchDatasetSchema, type ResearchDataset } from '../../src/lib/market/schema';
import { discoverArticles } from '../sources/collect';
import { errorDetails, fetchOriginal, sha256 } from '../sources/http';
import { releaseUrls } from '../sources/nbs-release';
import { readOptionalJson, readOriginal, storeOriginal, writeJson } from '../storage';
import { classifyResearch, extensionKinds, parseExtendedRelease, type ResearchRelease } from './nbs-extended';
import { makeResearchDataset, researchFile } from './publication';
import { replayPmi } from './replay';

export const researchReleasesFile = 'data/metadata/research-releases.json';
const ledgerSchema = z.record(digestSchema, z.object({
  suffix: z.string().regex(/^\d{6}\/t\d{8}_\d+\.html$/),
  listedDate: z.iso.date(),
  title: z.string().min(1),
  kind: z.enum(extensionKinds),
}).strict());

export async function readResearchLedger() {
  return ledgerSchema.parse(await readOptionalJson(researchReleasesFile) ?? {});
}

export async function replayResearch() {
  const ledger = await readResearchLedger();
  const rows = await replayPmi();
  for (const [hash, release] of Object.entries(ledger)) {
    const original = await readOriginal(hash);
    if (!releaseUrls(release).includes(original.meta.url)) throw new Error(`Unrecognized research URL: ${hash}`);
    const observations = parseExtendedRelease(original, release);
    if (!observations.length) throw new Error(`No reproducible evidence in ${hash}`);
    rows.push(...observations);
  }
  return rows;
}

async function fetchRelease(release: ResearchRelease) {
  const errors = [];
  for (const url of releaseUrls(release)) {
    try {
      const original = await fetchOriginal(url);
      const rows = parseExtendedRelease(original, release);
      if (!rows.length) throw new Error('No verified indicators in this release');
      return { original, rows };
    } catch (error) {
      errors.push(`${url}: ${errorDetails(error)}`);
    }
  }
  throw new Error(errors.join(' | '));
}

export async function refreshResearch(backfill = false, pmiStatus: 'available' | 'fetch_failed' = 'available', discover = discoverArticles) {
  const ledger = await readResearchLedger();
  const saved = await readOptionalJson(researchFile);
  const previous = saved === undefined ? null : researchDatasetSchema.parse(saved);
  const full = backfill || !Object.keys(ledger).length;
  const today = businessDate(new Date());
  const cutoff = full ? INITIAL_END : today;
  const status: ResearchDataset['source_status'] = { ...previous?.source_status, 'nbs-pmi': pmiStatus };
  const failures: { source: string; release?: string; error: string }[] = [];
  const discovered = await discover(full ? HISTORY_START : shiftMonth(today, -4), cutoff).catch((error: unknown) => {
    failures.push({ source: 'release archive', error: errorDetails(error) });
    return null;
  });
  const pending = (discovered ?? []).flatMap((article) => classifyResearch(article) ?? []);
  await Promise.all(['data/raw', 'data/metadata'].map((dir) => mkdir(dir, { recursive: true })));
  for (const source of extensionKinds) {
    const articles = pending.filter((article) => article.kind === source);
    let succeeded = 0;
    for (let i = 0; i < articles.length; i += 3) {
      const batch = articles.slice(i, i + 3);
      const results = await Promise.allSettled(batch.map(fetchRelease));
      for (const [j, result] of results.entries()) {
        const release = batch[j];
        if (result.status === 'rejected') {
          failures.push({ source, release: release.suffix, error: errorDetails(result.reason) });
          continue;
        }
        const { original, rows } = result.value;
        const eligible = rows.filter((row) => row.publication_date <= cutoff && row.observation_period.end <= cutoff);
        if (!eligible.length) continue;
        succeeded += 1;
        const hash = sha256(original.body);
        await storeOriginal(original, hash);
        ledger[hash] ??= release;
      }
    }
    const retained = Object.values(ledger).some((item) => item.kind === source);
    status[source] = discovered === null || (articles.length > 0 && !succeeded && !(full && retained)) ? 'fetch_failed'
      : failures.some((failure) => failure.source === source) ? 'partial'
        : retained ? 'available' : 'unconnected';
  }
  const sortedLedger = Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b)));
  await writeJson(researchReleasesFile, sortedLedger);
  const rows = (await replayResearch()).filter((row) => row.publication_date <= today && row.observation_period.end <= today);
  const publication = makeResearchDataset(rows, status);
  await writeJson(researchFile, publication);
  if (failures.length) {
    console.warn(failures);
    await writeJson('data/runs/research-failures.json', failures);
  }
  console.log(`Replayed ${publication.series.length} research observations from official originals`, status);
  return publication;
}

if (process.argv.includes('--collect-research')) {
  void refreshResearch(process.argv.includes('--backfill'), process.argv.includes('--core-failed') ? 'fetch_failed' : 'available')
    .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
