import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { parse } from 'yaml';

it('schedules Shanghai 11:17, accepts all main pushes and manual backfills, and serializes the writer', () => {
  const workflow = parse(readFileSync('.github/workflows/update-data.yml', 'utf8'));
  expect(workflow.on.schedule).toEqual([{ cron: '17 3 * * *' }]);
  expect(workflow.on.push).toEqual({ branches: ['main'] });
  expect(workflow.on.workflow_dispatch.inputs.backfill.type).toBe('boolean');
  expect(workflow.concurrency).toEqual({ group: 'employment-data-main', 'cancel-in-progress': false });
  expect(Object.keys(workflow.jobs)).toEqual(['update']);
  expect(workflow.jobs.update.if).toContain("github.actor != 'github-actions[bot]'");
  const writer = workflow.jobs.update.steps.find((step: { id?: string }) => step.id === 'commit');
  expect(writer.run).toContain('git push origin HEAD:refs/heads/main');
  expect(writer.run).toContain('if [[ "$RESULT" == success ]]');
  expect(writer.run).not.toMatch(/git add\s+\./);
});
