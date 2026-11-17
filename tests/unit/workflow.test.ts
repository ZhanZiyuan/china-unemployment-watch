import { readFileSync } from 'node:fs';
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
  expect(writer.run).toContain('git push origin HEAD:refs/heads/main');
  expect(writer.run).toContain('if [[ "$RESULT" == success ]]');
  expect(writer.run).toContain('"${sidecars[@]}"');
  expect(writer.run).toContain('^data/metadata/[a-f0-9]{64}\\.json$');
  expect(writer.run).not.toMatch(/git add\s+\./);
});

it('permits a manual hosted-runner check on develop without persisting push credentials', () => {
  const { jobs: { update } } = parse(readFileSync('.github/workflows/update-data.yml', 'utf8'));
  expect(update.if).toContain("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/develop'");
  const checkout = update.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/checkout@'));
  expect(checkout.with.ref).toBe('${{ github.ref }}');
  expect(checkout.with['persist-credentials']).toBe("${{ github.ref == 'refs/heads/main' }}");
});
