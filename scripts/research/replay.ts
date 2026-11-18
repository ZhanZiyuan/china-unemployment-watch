import { INITIAL_END } from '../../src/lib/market/dates';
import { releaseIndexFile, releaseIndexSchema } from '../replay-history';
import { parseSectorPmi } from '../sources/nbs-pmi';
import { releaseUrls } from '../sources/nbs-release';
import { readJson, readOriginal, writeJson } from '../storage';
import { makeResearchDataset, researchFile } from './publication';

export async function replayPmi() {
  const index = releaseIndexSchema.parse(await readJson(releaseIndexFile));
  const rows = [];
  for (const [hash, release] of Object.entries(index)) {
    if (release.kind !== 'nbs-pmi') continue;
    const original = await readOriginal(hash);
    if (!releaseUrls(release).includes(original.meta.url)) throw new Error(`Unrecognized archived URL: ${hash}`);
    rows.push(...parseSectorPmi(original, release));
  }
  return rows;
}

async function publishPmi() {
  const series = (await replayPmi()).filter((row) =>
    row.publication_date <= INITIAL_END && row.observation_period.end <= INITIAL_END);
  const release = makeResearchDataset(series, { 'nbs-pmi': 'available' });
  await writeJson(researchFile, release);
  console.log(release.coverage);
}

if (process.argv.includes('--publish-pmi')) void publishPmi();
