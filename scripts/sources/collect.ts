import { businessDate, HISTORY_START } from '../../src/lib/market/dates';
import { observationKey, type Observation } from '../../src/lib/market/schema';
import { errorDetails, fetchOriginal, retryOriginal, type Original } from './http';
import { parseLabour } from './nbs-labour';
import { parsePmi } from './nbs-pmi';
import { archive, parseArchive, pmiTitle, releaseUrls, type Release } from './nbs-release';

export type Collection = Awaited<ReturnType<typeof collect>>;
export type ReleaseFailure = { source_id: Release['kind']; release: Release; errors: string[] };

async function archivePage(url: string, page: number, request: typeof fetchOriginal) {
  try {
    const listing = parseArchive((await retryOriginal(url, request)).body.toString('utf8'));
    if (listing.page !== page) throw new Error(`Expected page ${page}, received page ${listing.page}`);
    return listing;
  } catch (error) {
    throw new Error(`${url}: ${errorDetails(error)}`, { cause: error });
  }
}

export async function discover(since: string, until: string, request = fetchOriginal) {
  let latest;
  try {
    latest = await archivePage(archive, 0, request);
  } catch (firstError) {
    try {
      latest = await archivePage(`${archive}index.html`, 0, request);
    } catch (secondError) {
      throw new Error(`NBS release archive failed: ${errorDetails(firstError)}; ${errorDetails(secondError)}`);
    }
  }
  const releases = [...latest.releases];
  let oldest = latest.oldest;
  for (let page = 1; page < latest.count && oldest >= since; page += 1) {
    const listing = await archivePage(`${archive}index_${page}.html`, page, request);
    if (listing.oldest < oldest) oldest = listing.oldest;
    releases.push(...listing.releases);
  }
  return [...new Map(releases
    .filter((release) => release.listedDate >= since && release.listedDate <= until)
    .filter((release) => release.kind !== 'nbs-pmi' || Number(pmiTitle.exec(release.title)?.[1]) >= 2023)
    .filter((release) => release.kind !== 'nbs-labour' || release.listedDate >= '2023-03-01')
    .map((release) => [release.suffix, release])).values()];
}

export async function collect(since: string, until: string, request = fetchOriginal, select: 'earliest' | 'latest' = 'earliest') {
  const releases = await discover(since, businessDate(new Date()), request);
  const originals = new Map<string, Original>();
  const observations = new Map<string, Observation>();
  const failures: ReleaseFailure[] = [];
  const originalsByRelease = new Map<string, Release>();
  for (let start = 0; start < releases.length; start += 4) {
    const results = await Promise.all(releases.slice(start, start + 4).map(async (release) => {
      const errors: string[] = [];
      for (const url of releaseUrls(release)) {
        try {
          const original = await request(url);
          const parse = release.kind === 'nbs-pmi' ? parsePmi : parseLabour;
          return { release, original, rows: parse(original, release), errors };
        } catch (error) {
          errors.push(`${url}: ${errorDetails(error)}`);
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
        if (!current || (select === 'earliest'
          ? row.publication_date < current.publication_date
          : row.publication_date > current.publication_date)) {
          observations.set(key, row);
        }
        originals.set(row.raw_sha256, original);
        originalsByRelease.set(row.raw_sha256, release);
      }
    }
  }
  return {
    releases,
    observations: [...observations.values()].sort((a, b) => observationKey(a).localeCompare(observationKey(b))),
    originals,
    originalsByRelease,
    failures,
  };
}
