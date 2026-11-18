import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { healthSchema, researchDatasetSchema, researchHealthSchema } from '../../src/lib/market/schema';

it('keeps the last verified JSON files byte-for-byte when an HTTP 200 response fails parsing', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'employment-publish-test-'));
  try {
    const existing = ['public/data/latest.json', 'public/data/manifest.json'];
    const originals = existing.map((file) => readFileSync(file));
    mkdirSync(join(workspace, 'public'), { recursive: true });
    mkdirSync(join(workspace, 'data'), { recursive: true });
    cpSync('public/data', join(workspace, 'public/data'), { recursive: true });
    cpSync('data/processed', join(workspace, 'data/processed'), { recursive: true });
    const tsx = execFileSync(process.execPath, ['-p', "require.resolve('tsx')"], { encoding: 'utf8' }).trim();
    const result = spawnSync(process.execPath, [
      '--import', tsx, '--import', resolve('tests/fixtures/unavailable-fetch.mjs'), resolve('scripts/fetch-data.ts'),
    ], { cwd: workspace, encoding: 'utf8', timeout: 10_000 });
    expect(result.status, result.stderr).toBe(1);
    expect(result.stderr).toContain('NBS release archive failed');
    existing.forEach((file, i) => expect(readFileSync(join(workspace, file))).toEqual(originals[i]));
    const health = healthSchema.parse(JSON.parse(readFileSync(join(workspace, 'public/data/collection-status.json'), 'utf8')));
    expect(health.result).toBe('fetch_failed');
    expect(health.dataset_version).toBe(JSON.parse(originals[0].toString()).dataset_version);
    expect(health.source_status).toEqual({ 'nbs-labour': 'fetch_failed', 'nbs-pmi': 'fetch_failed' });
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

it('retains the verified research archive when discovery is unavailable', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'employment-research-test-'));
  try {
    const publication = 'public/data/research.json';
    const initial = researchDatasetSchema.parse(JSON.parse(readFileSync(publication, 'utf8')));
    mkdirSync(join(workspace, 'public/data'), { recursive: true });
    mkdirSync(join(workspace, 'data'), { recursive: true });
    cpSync(publication, join(workspace, publication));
    cpSync('data/raw', join(workspace, 'data/raw'), { recursive: true });
    cpSync('data/metadata', join(workspace, 'data/metadata'), { recursive: true });
    const tsx = execFileSync(process.execPath, ['-p', "require.resolve('tsx')"], { encoding: 'utf8' }).trim();
    const modulePath = JSON.stringify(resolve('scripts/research/collect-data.ts'));
    const result = spawnSync(process.execPath, [
      '--import', tsx, '-e', `const {refreshResearch}=require(${modulePath});
        refreshResearch(false, 'available', async () => { throw new Error('Test archive failure'); })
          .catch((error) => { console.error(error); process.exitCode = 1; });`,
    ], { cwd: workspace, encoding: 'utf8', timeout: 10_000 });
    expect(result.status, result.stderr).toBe(0);
    const published = researchDatasetSchema.parse(JSON.parse(readFileSync(join(workspace, publication), 'utf8')));
    expect(published.series).toEqual(initial.series);
    const health = researchHealthSchema.parse(JSON.parse(readFileSync(join(workspace, 'public/data/research-collection-status.json'), 'utf8')));
    expect(health.result).toBe('fetch_failed');
    expect(health.source_status).toMatchObject({ 'nbs-pmi': 'available', 'nbs-real-estate': 'fetch_failed', financial: 'unconnected' });
    expect(readFileSync(join(workspace, 'data/metadata/research-releases.json'))).toEqual(readFileSync('data/metadata/research-releases.json'));
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
