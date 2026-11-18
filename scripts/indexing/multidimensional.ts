import { z } from 'zod';
import { BASELINE_END, BASELINE_START, calibrate, mean, standardize } from './model';
import { datasetSchema, digestSchema, researchDatasetSchema } from '../../src/lib/market/schema';
import { endOfMonth, HISTORY_START, shiftMonth } from '../../src/lib/market/dates';
import { researchAlgorithm, researchModelSchema } from '../../src/lib/market/research-model-schema';
import { replayResearch } from '../research/collect-data';
import { makeResearchDataset, researchFile } from '../research/publication';
import { releaseIndexFile, releaseIndexSchema, replayRelease } from '../replay-history';
import { readJson, writeJson } from '../storage';
import { sha256 } from '../sources/http';
import { latestFile } from '../publish';
import { localMidnight, vintageIndex } from './feature-selection';
import { horizons, rollingBacktest } from './multivariate-backtest';
import { compareModels, describeLags } from './model-comparison';

export const researchModelFile = 'public/data/research-models.json';
const calibrationFile = 'data/metadata/multidimensional-calibration-v1.json';
const ids = ['manufacturing_pmi_employment', 'construction_pmi_employment', 'services_pmi_employment'] as const;
const calibrationOrigin = localMidnight('2025-01-15');
const parameter = z.object({ median: z.number(), scale: z.number().positive(), n: z.number().int().min(18) }).strict();
const calibrationSchema = z.object({
  algorithm_version: z.literal(researchAlgorithm), baseline_start: z.literal(BASELINE_START), baseline_end: z.literal(BASELINE_END),
  archive_sha256: digestSchema, parameters: z.record(z.enum(ids), parameter),
}).strict();

function calibrateSectors(archive: ReturnType<typeof vintageIndex>) {
  const observations = ids.map((id) => {
    const observations = [];
    for (let month = BASELINE_START; month <= BASELINE_END; month = shiftMonth(month, 1)) {
      const evidence = archive.first(id, month);
      if (evidence?.row.value != null && evidence.available < calibrationOrigin) {
        observations.push({ month, value: evidence.row.value, sha256: evidence.row.raw_sha256 });
      }
    }
    return { id, observations };
  });
  return calibrationSchema.parse({
    algorithm_version: researchAlgorithm, baseline_start: BASELINE_START, baseline_end: BASELINE_END,
    archive_sha256: sha256(JSON.stringify(observations)),
    parameters: Object.fromEntries(observations.map(({ id, observations }) => [id, calibrate(observations.map((r) => r.value))])),
  });
}

export async function buildResearchModels(writeCalibration = false, replayed?: Awaited<ReturnType<typeof replayResearch>>) {
  const core = datasetSchema.parse(await readJson(latestFile));
  const research = researchDatasetSchema.parse(await readJson(researchFile));
  const ledger = releaseIndexSchema.parse(await readJson(releaseIndexFile));
  const archiveRows = (await Promise.all(Object.entries(ledger).map(([hash, release]) => replayRelease(hash, release)))).flat();
  const researchRows = replayed ?? await replayResearch();
  const archive = vintageIndex([...archiveRows, ...researchRows]);
  const calibration = calibrateSectors(archive);
  if (writeCalibration) await writeJson(calibrationFile, calibration);
  const frozen = calibrationSchema.parse(await readJson(calibrationFile));
  if (JSON.stringify(frozen) !== JSON.stringify(calibration)) throw new Error('Sector calibration differs from the frozen archive digest');

  const lastResearch = research.series.reduce((last, row) => row.observation_period.end > last ? row.observation_period.end : last, HISTORY_START);
  const lastTarget = core.coverage.find((item) => item.series_id === 'urban_unemployment')?.last ?? HISTORY_START;
  const current = makeResearchDataset(researchRows.filter((row) => row.observation_period.end <= lastResearch), research.source_status);
  const values = new Map([...core.series, ...current.series].map((row) =>
    [`${row.series_id}/${row.observation_period.end.slice(0, 7)}`, row.value]));
  const pressure = [];
  for (let month = HISTORY_START; month <= lastResearch; month = shiftMonth(month, 1)) {
    const components = ids.map((id) => values.get(`${id}/${month.slice(0, 7)}`) ?? null);
    if (components.some((value) => value === null)) continue;
    const score = mean(ids.map((id, i) => standardize(components[i]!, frozen.parameters[id])))!;
    pressure.push({ observation_period: { start: month, end: endOfMonth(month) }, value: Number((-score).toFixed(4)) });
  }
  const evaluations = Object.fromEntries(horizons.map((horizon) => {
    const result = rollingBacktest(archive, lastTarget, horizon);
    return [horizon, { ...result, metrics: compareModels(result.folds) }];
  }));
  return researchModelSchema.parse({
    algorithm_version: researchAlgorithm, dataset_version: research.dataset_version, core_dataset_version: core.dataset_version,
    calibration_sha256: sha256(JSON.stringify(frozen)),
    pressure: { status: research.source_status['nbs-pmi'] === 'fetch_failed' ? 'fetch_failed' : pressure.length ? 'exploratory' : 'insufficient_data', values: pressure },
    unavailable: { M5: 'financial_source_unconnected' },
    evaluations, descriptive_lags: describeLags(archive, lastTarget),
  });
}

if (process.argv.includes('--publish-research-models')) {
  void buildResearchModels(process.argv.includes('--freeze-calibration')).then(async (model) => {
    await writeJson(researchModelFile, model);
    for (const [horizon, result] of Object.entries(model.evaluations)) {
      console.log(horizon, result.eligible_cases, result.metrics.map(({ model, n, mae, rmse, direction_accuracy }) =>
        ({ model, n, mae, rmse, direction_accuracy })));
    }
  }).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
