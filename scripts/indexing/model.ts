import { z } from 'zod';
import { indexIds, type Index, type Observation } from '../../src/lib/market/schema';

export const ALGORITHM_VERSION = 'pmi-demand-1.0.0';
export const PMI_IDS = ['manufacturing_pmi_employment', 'nonmanufacturing_pmi_employment'] as const;
export const BASELINE_START = '2023-01-01';
export const BASELINE_END = '2024-12-31';
const minimumCalibration = 18;

const robustParameters = z.object({
  median: z.number(),
  scale: z.number().positive(),
  n: z.number().int().min(minimumCalibration),
}).strict();
export const calibrationSchema = z.object({
  algorithm_version: z.literal(ALGORITHM_VERSION),
  baseline_start: z.literal(BASELINE_START),
  baseline_end: z.literal(BASELINE_END),
  observations_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  manufacturing_pmi_employment: robustParameters,
  nonmanufacturing_pmi_employment: robustParameters,
}).strict();

export type Calibration = z.infer<typeof calibrationSchema>;
type Robust = z.infer<typeof robustParameters>;
type Point = Index['values'][number];

export function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calibrate(values: number[], minimum = minimumCalibration): Robust | null {
  if (values.length < minimum || values.some((value) => !Number.isFinite(value))) return null;
  const center = median(values);
  const scale = 1.4826 * median(values.map((value) => Math.abs(value - center)));
  return scale > 0 ? { median: center, scale, n: values.length } : null;
}

export function standardize(value: number, parameters: Robust) {
  const zScore = (value - parameters.median) / parameters.scale;
  return Math.max(-5, Math.min(5, zScore));
}

export function pmiPairs(rows: Observation[]) {
  const nonmanufacturing = new Map(rows.filter((row) => row.series_id === PMI_IDS[1]).map((row) => [row.observation_period.start, row]));
  return rows.flatMap((manufacturing) => {
    if (manufacturing.series_id !== PMI_IDS[0] || manufacturing.value === null) return [];
    const other = nonmanufacturing.get(manufacturing.observation_period.start);
    if (other?.value === null || !other) return [];
    return [{
      observation_period: manufacturing.observation_period,
      manufacturing: manufacturing.value,
      nonmanufacturing: other.value,
      release_date: [manufacturing.publication_date, other.publication_date].sort()[1],
    }];
  }).sort((a, b) => a.observation_period.start.localeCompare(b.observation_period.start));
}

export function makeShadowIndex(search: Point[], demand: Point[]): Point[] {
  const byPeriod = new Map(demand.map((point) => [point.observation_period.start, point]));
  return search.flatMap((pressure) => {
    const demandPoint = byPeriod.get(pressure.observation_period.start);
    if (!demandPoint || demandPoint.observation_period.end !== pressure.observation_period.end) return [];
    return [{ observation_period: pressure.observation_period, value: (pressure.value - demandPoint.value) / 2 }];
  });
}

export function experimentalIndices(rows: Observation[], calibration: Calibration): Index[] {
  const demand = pmiPairs(rows).map(({ observation_period, manufacturing, nonmanufacturing }) => {
    const first = standardize(manufacturing, calibration.manufacturing_pmi_employment);
    const second = standardize(nonmanufacturing, calibration.nonmanufacturing_pmi_employment);
    return { observation_period, value: Number(((first + second) / 2).toFixed(4)) };
  });
  const search: Point[] = [];
  const data = { search_pressure: search, employment_demand: demand, shadow_pressure: makeShadowIndex(search, demand), exam_search: [] };
  return indexIds.map((id) => {
    const values = data[id];
    return { id, frequency: 'monthly', status: values.length ? 'experimental' : 'insufficient_data', values };
  });
}
