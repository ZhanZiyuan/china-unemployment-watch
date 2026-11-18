import { z } from 'zod';
import { digestSchema, periodSchema } from './schema';

export const researchAlgorithm = 'sector-pressure-1.0.0';
const modelIds = z.enum(['M0', 'M1', 'M2', 'M3', 'M4']);
const metrics = z.object({
  n: z.number().int().nonnegative(), first: z.iso.date().nullable(), last: z.iso.date().nullable(),
  mae: z.number().nonnegative().nullable(), rmse: z.number().nonnegative().nullable(),
  direction_accuracy: z.number().min(0).max(1).nullable(), correlation: z.number().min(-1).max(1).nullable(),
});
const transform = z.object({ median: z.number(), scale: z.number().positive(), n: z.number().int().positive() }).strict();
const forecast = z.object({
  estimate: z.number(), intercept: z.number(), coefficients: z.record(z.string(), z.number()),
  transforms: z.record(z.string(), transform),
  dropped: z.array(z.object({ name: z.string(), reason: z.string() }).strict()),
}).strict();
const fold = z.object({
  month: z.iso.date(), forecast_origin: z.iso.datetime(), outcome_available_at: z.iso.datetime(), prior: z.number(), actual: z.number(),
  training_count: z.number().int().min(18), training_first: z.iso.date(), training_last: z.iso.date(),
  input: z.record(z.string(), z.number()), forecasts: z.record(modelIds, forecast),
}).strict().refine((row) => row.training_first <= row.training_last && row.training_last < row.month &&
  row.forecast_origin < row.outcome_available_at);
const backtest = z.object({
  folds: z.array(fold),
  eligible_cases: z.number().int().nonnegative(),
  exclusions: z.object({
    target_unavailable: z.number().int().nonnegative(), prior_unavailable: z.number().int().nonnegative(),
    incomplete_features: z.number().int().nonnegative(),
  }).strict(),
  metrics: z.array(metrics.extend({
    model: modelIds, status: z.enum(['exploratory', 'insufficient_data']),
    mae_improvement_vs_persistence: z.number().nullable(), mae_improvement_vs_pmi: z.number().nullable(),
    paired_mae_vs_pmi: z.object({ difference: z.number().nullable(), interval: z.array(z.number()).length(2).nullable() }).strict(),
    halves: z.array(metrics.strict()).length(2),
  }).strict()),
}).strict();
export const researchModelSchema = z.object({
  algorithm_version: z.literal(researchAlgorithm),
  dataset_version: digestSchema,
  core_dataset_version: digestSchema,
  calibration_sha256: digestSchema,
  pressure: z.object({
    status: z.enum(['exploratory', 'insufficient_data', 'fetch_failed']),
    values: z.array(z.object({ observation_period: periodSchema, value: z.number().min(-5).max(5) }).strict()),
  }).strict(),
  unavailable: z.object({ M5: z.literal('financial_source_unconnected') }).strict(),
  evaluations: z.object({ nowcast: backtest, next_period: backtest }).strict(),
  descriptive_lags: z.array(z.object({
    series_id: z.string(), lag: z.number().int().min(-3).max(3), n: z.number().int().nonnegative(),
    first: z.iso.date().nullable(), last: z.iso.date().nullable(), pearson: z.number().min(-1).max(1).nullable(),
  }).strict()),
}).strict();
export type ResearchModels = z.infer<typeof researchModelSchema>;
