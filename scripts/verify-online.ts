import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { healthSchema, manifestSchema } from '../src/lib/market/schema';
import { healthFile, manifestFile } from './publish';
import { sha256 } from './sources/http';
import { readJson } from './storage';

async function main() {
  const base = new URL(process.env.PRODUCTION_URL ?? 'https://cuwatch.vercel.app');
  if (base.protocol !== 'https:') throw new Error('Expected an HTTPS production URL');
  const manifest = manifestSchema.parse(await readJson(manifestFile));
  const health = healthSchema.parse(await readJson(healthFile));
  const expected = [await readFile(manifestFile), await readFile(healthFile)];
  const paths = ['/data/manifest.json', manifest.health, manifest.latest];
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      const bodies = await Promise.all(paths.map(async (path) => {
        const url = new URL(path, base);
        url.searchParams.set('check', `${Date.now()}-${attempt}`);
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
        if (!response.ok) throw new Error(`${response.status} ${path}`);
        return Buffer.from(await response.arrayBuffer());
      }));
      if (sha256(bodies[0]) !== sha256(expected[0]) || sha256(bodies[1]) !== sha256(expected[1]) ||
          sha256(bodies[2]) !== manifest.sha256) throw new Error('Production is serving another snapshot');
      console.log(`Online dataset ${manifest.dataset_version} and collection ${health.attempted_at} verified.`);
      return;
    } catch (error) {
      console.log(`Deployment check ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (attempt < 24) await setTimeout(15_000);
  }
  throw new Error('Vercel did not serve the expected dataset and collection health before the deadline');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
