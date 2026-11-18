import { mkdir } from 'node:fs/promises';
import { z } from 'zod';
import { businessDate, dayNumber, HISTORY_START, INITIAL_END, shiftMonth } from '../../src/lib/market/dates';
import { researchCatalog } from '../../src/lib/market/research-catalog';
import { digestSchema, researchDatasetSchema, researchHealthSchema, type ResearchDataset } from '../../src/lib/market/schema';
import { discoverArticles } from '../sources/collect';
import { errorDetails, fetchOriginal, sha256 } from '../sources/http';
import { readOptionalJson, readOriginal, storeOriginal, writeJson } from '../storage';
import { classifyResearch, extensionKinds, parseExtendedRelease, type ResearchRelease } from './nbs-extended';
import { releaseSignature } from './observations';
import { makeResearchDataset, researchFile, researchHealthFile } from './publication';
import { propertyYearEndReleases, researchReleaseUrls } from './real-estate-year-end';
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
    if (!researchReleaseUrls(release).includes(original.meta.url)) throw new Error(`Unrecognized research URL: ${hash}`);
    const observations = parseExtendedRelease(original, release);
    if (!observations.length) throw new Error(`No reproducible evidence in ${hash}`);
    rows.push(...observations);
  }
  return rows;
}

async function fetchRelease(release: ResearchRelease) {
  const errors = [];
  for (const url of researchReleaseUrls(release)) {
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

export async function refreshResearch(
  backfill = false, pmiStatus: 'available' | 'fetch_failed' = 'available', discover = discoverArticles, yearEndOnly = false,
) {
  const started = new Date();
  const ledger = await readResearchLedger();
  const saved = await readOptionalJson(researchFile);
  const previous = saved === undefined ? null : researchDatasetSchema.parse(saved);
  const full = backfill || !Object.keys(ledger).length;
  const today = businessDate(started);
  const cutoff = full ? INITIAL_END : today;
  const status: ResearchDataset['source_status'] = { ...previous?.source_status };
  if (!yearEndOnly) status['nbs-pmi'] = pmiStatus;
  const failures: { source: string; release?: string; error: string }[] = [];
  const discovered = yearEndOnly ? [] : await discover(full ? HISTORY_START : shiftMonth(today, -4), cutoff).catch((error: unknown) => {
    failures.push({ source: 'release archive', error: errorDetails(error) });
    return null;
  });
  const pending = new Map((discovered ?? []).flatMap((article) => {
    const release = classifyResearch(article);
    return release ? [[release.suffix, release] as const] : [];
  }));
  if (yearEndOnly || full) {
    for (const release of propertyYearEndReleases) pending.set(release.suffix, release);
  }
  await Promise.all(['data/raw', 'data/metadata'].map((dir) => mkdir(dir, { recursive: true })));
  for (const source of yearEndOnly ? ['nbs-real-estate'] as const : extensionKinds) {
    const articles = [...pending.values()].filter((article) => article.kind === source);
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
        if (ledger[hash]) continue;
        const earlier = await Promise.all(Object.entries(ledger).filter(([, item]) => item.suffix === release.suffix)
          .map(async ([id, item]) => ({ original: await readOriginal(id), item })));
        const latest = earlier.sort((a, b) => b.original.meta.fetched_at.localeCompare(a.original.meta.fetched_at))[0];
        if (latest && releaseSignature(parseExtendedRelease(latest.original, latest.item)) === releaseSignature(rows)) continue;
        await storeOriginal(original, hash);
        ledger[hash] = release;
      }
    }
    const retained = Object.values(ledger).some((item) => item.kind === source);
    status[source] = discovered === null || (articles.length > 0 && !succeeded && !((full || yearEndOnly) && retained)) ? 'fetch_failed'
      : failures.some((failure) => failure.source === source) ? 'partial'
        : retained ? 'available' : 'unconnected';
  }
  const sortedLedger = ledgerSchema.parse(Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => a.localeCompare(b))));
  await writeJson(researchReleasesFile, sortedLedger);
  const rows = (await replayResearch()).filter((row) => row.publication_date <= today && row.observation_period.end <= today);
  const publication = makeResearchDataset(rows, status);
  await writeJson(researchFile, publication);
  const stale_series = publication.coverage.filter(({ series_id, last }) => {
    const metric = researchCatalog[series_id];
    // A dated annual release may legitimately arrive into the following calendar year.
    const maxAge = metric.frequency === 'yearly' ? 550 : metric.metric_type.startsWith('cumulative_') ? 90 : 70;
    return last && dayNumber(today) - dayNumber(last) > maxAge * 86_400_000;
  }).map(({ series_id }) => series_id);
  const states = Object.values(publication.source_status);
  const health = researchHealthSchema.parse({
    attempted_at: started.toISOString(), completed_at: new Date().toISOString(), dataset_version: publication.dataset_version,
    source_status: publication.source_status, stale_series,
    result: states.includes('fetch_failed') ? 'fetch_failed' : states.includes('partial') || stale_series.length ? 'partial' : 'success',
  });
  await mkdir('data/runs', { recursive: true });
  await writeJson('data/runs/research-collection.json', { ...health, cutoff, failures, ...(yearEndOnly ? { scope: 'property-year-end' } : {}) });
  if (failures.length) console.warn(failures);
  await writeJson(researchHealthFile, health);
  console.log(`Replayed ${publication.series.length} research observations from official originals`, publication.source_status);
  return publication;
}

if (process.argv.includes('--collect-research')) {
  void refreshResearch(process.argv.includes('--backfill'), process.argv.includes('--core-failed') ? 'fetch_failed' : 'available',
    undefined, process.argv.includes('--property-year-end'))
    .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
