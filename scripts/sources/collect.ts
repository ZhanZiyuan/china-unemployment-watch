import { businessDate, HISTORY_START } from '../../src/lib/market/dates';
import { observationKey, type Observation } from '../../src/lib/market/schema';
import { fetchOriginal, type Original } from './http';
import { parseLabour } from './nbs-labour';
import { parsePmi } from './nbs-pmi';
import { archive, parseArchive, pmiTitle, releaseUrls, type Release } from './nbs-release';

export type Collection = Awaited<ReturnType<typeof collect>>;
export type ReleaseFailure = { source_id: Release['kind']; release: Release; errors: string[] };

export async function discover(since: string, until: string, request = fetchOriginal) {
  const latest = parseArchive((await request(archive)).body.toString('utf8'));
  const releases = [...latest.releases];
  let oldest = latest.oldest;
  for (let page = 1; page < latest.count && oldest >= since; page += 4) {
    const pages = Array.from({ length: Math.min(4, latest.count - page) }, (_, offset) => page + offset);
    const results = await Promise.all(pages.map(async (index) => {
      return parseArchive((await request(`${archive}index_${index}.html`)).body.toString('utf8'));
    }));
    for (const result of results) {
      if (result.oldest < oldest) oldest = result.oldest;
      releases.push(...result.releases);
    }
  }
  return [...new Map(releases
    .filter((release) => release.listedDate >= since && release.listedDate <= until)
    .filter((release) => release.kind !== 'nbs-pmi' || Number(pmiTitle.exec(release.title)?.[1]) >= 2023)
    .filter((release) => release.kind !== 'nbs-labour' || release.listedDate >= '2023-03-01')
    .map((release) => [release.suffix, release])).values()];
}

export async function collect(since: string, until: string, request = fetchOriginal) {
  const releases = await discover(since, businessDate(new Date()), request);
  const originals = new Map<string, Original>();
  const observations = new Map<string, Observation>();
  const failures: ReleaseFailure[] = [];
  for (let start = 0; start < releases.length; start += 4) {
    const results = await Promise.all(releases.slice(start, start + 4).map(async (release) => {
      const errors: string[] = [];
      for (const url of releaseUrls(release)) {
        try {
          const original = await request(url);
          const parse = release.kind === 'nbs-pmi' ? parsePmi : parseLabour;
          return { release, original, rows: parse(original, release), errors };
        } catch (error) {
          errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return { release, errors };
    }));
    for (const { release, original, rows, errors } of results) {
      if (!original || !rows) {
        failures.push({ source_id: release.kind, release, errors });
        continue;
      }
      console.log(`${release.kind} ${release.title}: ${original.meta.url}`);
      for (const row of rows) {
        const { start, end } = row.observation_period;
        if (start < HISTORY_START || end > until) continue;
        const key = observationKey(row);
        const current = observations.get(key);
        if (current?.publication_date === row.publication_date && current.value !== row.value) {
          throw new Error(`Conflicting same-day official observations: ${key}`);
        }
        if (!current || row.publication_date < current.publication_date) {
          observations.set(key, row);
        }
        originals.set(row.raw_sha256, original);
      }
    }
  }
  return {
    releases,
    observations: [...observations.values()].sort((a, b) => observationKey(a).localeCompare(observationKey(b))),
    originals,
    failures,
  };
}
