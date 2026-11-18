import { z } from 'zod';
import { businessDate, endOfMonth, HISTORY_START, shiftDay, shiftMonth } from './dates';
import { researchCatalog, researchFrequencies, researchIds, researchSources, researchUnits } from './research-catalog';

export const sources = ['nbs-labour', 'nbs-pmi', 'google-trends', 'baidu-index', 'recruitment'] as const;
export const frequencySchema = z.enum(['daily', 'weekly', 'monthly']);
export const statusSchema = z.enum([
  'observed', 'zero', 'missing', 'not_yet_published', 'fetch_failed',
  'invalid', 'suppressed', 'not_applicable', 'revised',
]);
export const definitions = {
  urban_unemployment: { source: 'nbs-labour', frequency: 'monthly', unit: 'percent' },
  city_unemployment: { source: 'nbs-labour', frequency: 'monthly', unit: 'percent' },
  manufacturing_pmi_employment: { source: 'nbs-pmi', frequency: 'monthly', unit: 'diffusion_points' },
  nonmanufacturing_pmi_employment: { source: 'nbs-pmi', frequency: 'monthly', unit: 'diffusion_points' },
} as const;
export type SeriesId = keyof typeof definitions;
export type SourceId = typeof sources[number];

export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const periodSchema = z.object({ start: z.iso.date(), end: z.iso.date() }).strict();
const nbsUrl = z.url().refine((url) => {
  const u = new URL(url);
  return u.protocol === 'https:' && (
    (u.hostname === 'www.stats.gov.cn' && /^\/(?:sj|zwfwck|zt_18555|xxgk)\//.test(u.pathname)) ||
    (u.hostname === 'app.www.gov.cn' && u.pathname.startsWith('/govdata/gov/'))
  ) && !u.username && !u.password && !u.port;
}, 'Expected an official NBS release or its State Council mirror');

const observationFields = z.object({
  source_id: z.enum(['nbs-labour', 'nbs-pmi']),
  source_url: nbsUrl,
  series_id: z.enum(['urban_unemployment', 'city_unemployment', 'manufacturing_pmi_employment', 'nonmanufacturing_pmi_employment']),
  observation_period: periodSchema,
  frequency: frequencySchema,
  value: z.number().min(0).max(100).nullable(),
  unit: z.enum(['percent', 'diffusion_points']),
  status: statusSchema,
  fetched_at: z.iso.datetime(),
  published_at: z.iso.datetime().nullable(),
  publication_date: z.iso.date(),
  raw_sha256: digestSchema,
  evidence: z.string().min(1).max(240),
  revision_id: digestSchema.nullable(),
}).strict();

export const observationSchema = observationFields.superRefine((row, ctx) => {
  const definition = definitions[row.series_id];
  const { start, end } = row.observation_period;
  const observed = ['observed', 'zero', 'revised'].includes(row.status);
  const correctPeriod = {
    monthly: start.endsWith('-01') && endOfMonth(start) === end,
    weekly: shiftDay(start, 6) === end,
    daily: end === start && end < businessDate(row.fetched_at),
  }[row.frequency];
  if (row.source_id !== definition.source || row.unit !== definition.unit || row.frequency !== definition.frequency ||
      start < HISTORY_START || start > end ||
      row.publication_date > businessDate(row.fetched_at) || row.publication_date < (row.source_id === 'nbs-pmi' ? start : end) ||
      (row.published_at && (businessDate(row.published_at) !== row.publication_date || Date.parse(row.published_at) > Date.parse(row.fetched_at))) ||
      !correctPeriod ||
      observed !== (row.value !== null) || (row.value === 0 && !['zero', 'revised'].includes(row.status)) ||
      (row.status === 'zero' && row.value !== 0) || ((row.status === 'revised') !== (row.revision_id !== null))) {
    ctx.addIssue({ code: 'custom', message: 'Inconsistent source, value, dates, statistical period, or revision' });
  }
});

export type Observation = z.infer<typeof observationSchema>;
export const observationKey = (row: Observation) => `${row.source_id}/${row.series_id}/${row.observation_period.start}`;

export const sourceCatalog = {
  'nbs-labour': { url: 'https://www.stats.gov.cn/sj/zxfb/', access: 'connected' },
  'nbs-pmi': { url: 'https://www.stats.gov.cn/sj/zxfb/', access: 'connected' },
  'google-trends': { url: 'https://developers.google.com/search/apis/trends', access: 'approval_required' },
  'baidu-index': { url: 'https://index.baidu.com/Helper/?tpl=help', access: 'approval_required' },
  recruitment: { url: null, access: 'unconnected' },
} as const;

export const indexIds = ['search_pressure', 'employment_demand', 'shadow_pressure', 'exam_search'] as const;
export const indexSchema = z.object({
  id: z.enum(indexIds),
  frequency: frequencySchema,
  status: z.enum(['insufficient_data', 'experimental']),
  values: z.array(z.object({ observation_period: periodSchema, value: z.number().finite() }).strict()),
}).strict().refine((index) => (index.values.length === 0) === (index.status === 'insufficient_data'));
export type Index = z.infer<typeof indexSchema>;

const coverageSchema = z.object({
  series_id: observationSchema.shape.series_id,
  first: z.iso.date().nullable(),
  last: z.iso.date().nullable(),
  fetched_at: z.iso.datetime().nullable(),
  available: z.number().int().nonnegative(),
  missing: z.array(periodSchema),
  not_yet_published: periodSchema.nullable(),
}).strict();

export const datasetSchema = z.object({
  schema_version: z.literal('1.0.0'),
  dataset_version: digestSchema,
  algorithm_version: z.string().min(1),
  generated_at: z.iso.datetime(),
  time_zone: z.literal('Asia/Shanghai'),
  observation_start: z.literal(HISTORY_START),
  observation_end: z.iso.date().nullable(),
  initial_end: z.literal('2026-11-17'),
  quality_status: z.enum(['passed', 'partial_coverage']),
  quality_flags: z.array(z.object({
    series_id: observationSchema.shape.series_id,
    period_end: z.iso.date(),
    code: z.enum(['unusual_change']),
  }).strict()),
  series: z.array(observationSchema),
  coverage: z.array(coverageSchema),
  indices: z.array(indexSchema),
  revision_count: z.number().int().nonnegative(),
}).strict();

export const manifestSchema = datasetSchema.pick({
  schema_version: true, dataset_version: true, algorithm_version: true,
  generated_at: true, observation_start: true, observation_end: true, quality_status: true,
}).extend({
  latest: z.literal('/data/latest.json'),
  sha256: digestSchema,
  health: z.literal('/data/collection-status.json'),
}).strict();

export const healthSchema = z.object({
  attempted_at: z.iso.datetime(),
  completed_at: z.iso.datetime(),
  attempted_at_shanghai: z.iso.datetime({ offset: true }),
  dataset_version: digestSchema.nullable(),
  result: z.enum(['success', 'fetch_failed', 'invalid']),
  source_status: z.object({
    'nbs-labour': z.enum(['verified', 'fetch_failed', 'invalid', 'retained']),
    'nbs-pmi': z.enum(['verified', 'fetch_failed', 'invalid', 'retained']),
  }).strict(),
  workflow_url: z.url().nullable(),
}).strict();

export type Dataset = z.infer<typeof datasetSchema>;
export type Health = z.infer<typeof healthSchema>;
export type Manifest = z.infer<typeof manifestSchema>;

// The research contract extends the supported grains while keeping the 1.0.0 publication schema stable.
export const researchObservationSchema = observationFields.extend({
  source_id: z.enum(researchSources),
  series_id: z.enum(researchIds),
  frequency: z.enum(researchFrequencies),
  value: z.number().finite(),
  unit: z.enum(researchUnits),
  status: z.enum(['observed', 'zero']),
  revision_id: z.null(),
}).superRefine((row, ctx) => {
  const metric = researchCatalog[row.series_id];
  const { start, end } = row.observation_period;
  const [min, max] = metric.valid_range;
  const isCumulative = metric.metric_type.startsWith('cumulative_');
  const correctPeriod = {
    monthly: endOfMonth(end) === end && (isCumulative
      ? start === `${end.slice(0, 4)}-01-01` && !end.endsWith('-01-31')
      : start === `${end.slice(0, 7)}-01`),
    quarterly: /^\d{4}-(01|04|07|10)-01$/.test(start) && end === shiftDay(shiftMonth(start, 3), -1),
    yearly: start === `${end.slice(0, 4)}-01-01` && end.endsWith('-12-31'),
  }[row.frequency];
  if (row.source_id !== metric.source_id || row.frequency !== metric.frequency || row.unit !== metric.unit ||
      start < HISTORY_START || !correctPeriod || row.publication_date < (row.source_id === 'nbs-pmi' ? start : end) ||
      row.publication_date > businessDate(row.fetched_at) || end > businessDate(row.fetched_at) ||
      (row.published_at && (businessDate(row.published_at) !== row.publication_date || row.published_at > row.fetched_at)) ||
      (min !== null && row.value < min) || (max !== null && row.value > max) || (row.status === 'zero') !== (row.value === 0)) {
    ctx.addIssue({ code: 'custom', message: 'Inconsistent research series, period, publication date, or value' });
  }
});

export type ResearchObservation = z.infer<typeof researchObservationSchema>;
export const researchKey = (row: ResearchObservation) => `${row.series_id}/${row.observation_period.end}`;

const researchSourceStatus = z.enum(['available', 'partial', 'fetch_failed', 'unconnected']);
export const researchDatasetSchema = z.object({
  schema_version: z.literal('research-1.0.0'),
  dataset_version: digestSchema,
  series: z.array(researchObservationSchema),
  coverage: z.array(z.object({
    series_id: z.enum(researchIds), count: z.number().int().nonnegative(),
    first: z.iso.date().nullable(), last: z.iso.date().nullable(), missing: z.array(z.iso.date()),
  }).strict()),
  source_status: z.partialRecord(z.enum(researchSources), researchSourceStatus),
}).strict();
export type ResearchDataset = z.infer<typeof researchDatasetSchema>;
