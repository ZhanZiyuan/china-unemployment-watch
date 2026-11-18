import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { parse } from 'yaml';

it('schedules Shanghai 11:17, accepts all main pushes and manual backfills, and serializes the writer', () => {
  const workflow = parse(readFileSync('.github/workflows/update-data.yml', 'utf8'));
  expect(workflow.on.schedule).toEqual([{ cron: '17 3 * * *' }]);
  expect(workflow.on.push).toEqual({ branches: ['main'] });
  expect(workflow.on.workflow_dispatch.inputs.backfill.type).toBe('boolean');
  expect(workflow.concurrency).toEqual({ group: 'employment-data-${{ github.ref_name }}', 'cancel-in-progress': false });
  expect(Object.keys(workflow.jobs)).toEqual(['update']);
  expect(workflow.jobs.update.if).toContain("github.actor != 'github-actions[bot]'");
  const writer = workflow.jobs.update.steps.find((step: { id?: string }) => step.id === 'commit');
  expect(writer.if).toBe("github.ref == 'refs/heads/main'");
  expect(writer.run).toContain('bash .github/scripts/push-data-commit.sh');
  expect(writer.run).toContain('if [[ "$RESULT" == success ]]');
  expect(writer.run).toContain('git add -- "$archive" "$metadata"');
  expect(writer.run).toContain('^[a-f0-9]{64}$');
  expect(writer.run).toContain('public/data/research-models.json');
  expect(writer.run).not.toMatch(/git add\s+\./);
});

it('publishes a current snapshot, skips a stale one and reports other push failures', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'cuw-test-publish-'));
  try {
    const remote = join(tmp, 'origin.git');
    const writer = join(tmp, 'writer');
    const newer = join(tmp, 'newer');
    const output = join(tmp, 'output');
    const script = resolve('.github/scripts/push-data-commit.sh');
    const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const commit = (cwd: string, message: string) => git(cwd,
      '-c', 'user.name=Integration Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', message);
    const publish = () => {
      writeFileSync(output, '');
      return spawnSync('bash', [script], { cwd: writer, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: output } });
    };

    git(tmp, 'init', '--bare', '--initial-branch=main', remote);
    git(tmp, 'clone', remote, writer);
    commit(writer, 'Initial main');
    git(writer, 'push', 'origin', 'HEAD:refs/heads/main');
    commit(writer, 'Verified data');
    expect(publish().status).toBe(0);
    expect(readFileSync(output, 'utf8')).toBe('pushed=true\n');
    expect(git(remote, 'rev-parse', 'main')).toBe(git(writer, 'rev-parse', 'HEAD'));

    git(tmp, 'clone', remote, newer);
    commit(writer, 'Snapshot prepared for the previous main');
    commit(newer, 'Human merge to main');
    git(newer, 'push', 'origin', 'HEAD:refs/heads/main');
    const superseded = publish();
    expect(superseded.status, superseded.stderr).toBe(0);
    expect(superseded.stdout).toContain('Data publication superseded');
    expect(readFileSync(output, 'utf8')).toBe('');
    expect(git(remote, 'rev-parse', 'main')).toBe(git(newer, 'rev-parse', 'HEAD'));

    git(writer, 'remote', 'set-url', 'origin', join(tmp, 'missing.git'));
    const failed = publish();
    expect(failed.status).not.toBe(0);
    expect(failed.stdout).not.toContain('Data publication superseded');
    expect(readFileSync(output, 'utf8')).toBe('');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

it('permits a manual hosted-runner check on the development branches without persisting push credentials', () => {
  const { jobs: { update } } = parse(readFileSync('.github/workflows/update-data.yml', 'utf8'));
  expect(update.if).toContain("github.event_name == 'workflow_dispatch'");
  expect(update.if).toContain("github.ref == 'refs/heads/develop'");
  expect(update.if).toContain("github.ref == 'refs/heads/feature/multidimensional-employment'");
  const checkout = update.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/checkout@'));
  expect(checkout.with.ref).toBe('${{ github.ref }}');
  expect(checkout.with['persist-credentials']).toBe("${{ github.ref == 'refs/heads/main' }}");
});
