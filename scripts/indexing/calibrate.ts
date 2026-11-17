import { writeFile } from 'node:fs/promises';
import { ALGORITHM_VERSION, BASELINE_END, BASELINE_START, calibrate, calibrationSchema, PMI_IDS } from './model';
import { observationsFile, observationsSchema, readJson } from '../storage';
import { sha256 } from '../sources/http';

export const calibrationFile = 'data/metadata/pmi-calibration-v1.json';

async function main() {
  const rows = observationsSchema.parse(await readJson(observationsFile));
  const baseline = rows.filter((row) => row.observation_period.start >= BASELINE_START &&
    row.observation_period.end <= BASELINE_END && (row.series_id === PMI_IDS[0] || row.series_id === PMI_IDS[1]));
  const parameters = Object.fromEntries(PMI_IDS.map((id) => [id, calibrate(baseline.flatMap((row) =>
    row.series_id === id && row.value !== null ? [row.value] : []))]));
  const data = calibrationSchema.parse({
    algorithm_version: ALGORITHM_VERSION,
    baseline_start: BASELINE_START,
    baseline_end: BASELINE_END,
    observations_sha256: sha256(JSON.stringify(baseline)),
    ...parameters,
  });
  await writeFile(calibrationFile, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
}

if (process.argv.includes('--freeze-v1')) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
