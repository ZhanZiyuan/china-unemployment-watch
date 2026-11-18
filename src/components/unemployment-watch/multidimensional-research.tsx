import { BarChart3, Download } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dayNumber, endOfMonth, HISTORY_START } from '@/lib/market/dates';
import { categories, researchCatalog, type ResearchSeries } from '@/lib/market/research-catalog';
import type { ResearchDataset } from '@/lib/market/schema';
import type { ResearchModels } from '@/lib/market/research-model-schema';
import { MarketChart, type ChartSeries } from './market-chart';

const palette = ['var(--chart-blue)', 'var(--chart-teal)', 'var(--color-chart-3)', 'var(--color-chart-4)',
  'var(--color-chart-5)', 'var(--color-chart-1)', 'var(--color-chart-2)'];
const property = ['investment', 'starts', 'construction', 'completions', 'sales_area', 'sales_value', 'funds'] as const;
const modelIds = ['M0', 'M1', 'M2', 'M3', 'M4'] as const;
const methodology = 'https://github.com/ZhanZiyuan/china-unemployment-watch/blob/main/docs/multidimensional-methodology.md';
const sources = 'https://github.com/ZhanZiyuan/china-unemployment-watch/blob/main/docs/multidimensional-data.md';

export async function MultidimensionalResearch({ research, models }: { research: ResearchDataset | null; models: ResearchModels | null }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const end = research?.series.map((row) => row.observation_period.end).sort().at(-1) ?? HISTORY_START;
  const bounds = { start: HISTORY_START, end };
  const month = (day: string | null) => day ? format.dateTime(new Date(dayNumber(day)), { year: 'numeric', month: 'short' }) : '—';
  const number = (value: number | null, percentage = false) => value === null ? '—' : format.number(value,
    percentage ? { style: 'percent', maximumFractionDigits: 1 } : { maximumFractionDigits: 4 });
  const series = (ids: ResearchSeries[]): ChartSeries[] => ids.map((id, index) => ({
    id, label: t(`research.series.${id}`), color: palette[index], unit: researchCatalog[id].unit, frequency: researchCatalog[id].frequency,
    jointJanuary: researchCatalog[id].metric_type.startsWith('cumulative_'),
    points: research?.series.filter((row) => row.series_id === id) ?? [],
  }));
  const chart = (id: string, ids: ResearchSeries[], reference?: number) => <MarketChart
    id={id} title={t(`research.charts.${id}`)} description={t(`research.explain.${id}`)}
    series={series(ids)} bounds={bounds} reference={reference} />;

  return <section id="research" aria-labelledby="research-title" className="space-y-5 scroll-mt-20">
    <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-6">
      <div className="max-w-2xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <BarChart3 aria-hidden className="size-5 text-primary" />
          <h2 id="research-title" className="text-2xl font-semibold tracking-tight">{t('research.title')}</h2>
          <Badge variant="secondary">{t('status.experimental')}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('research.summary')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {research && <Button size="sm" variant="outline" asChild><a href="/data/research.json" download><Download />{t('research.data')}</a></Button>}
        <Button size="sm" variant="ghost" asChild><a href={sources}>{t('dashboard.source_link')}</a></Button>
      </div>
    </div>
    <Tabs defaultValue="construction">
      <TabsList aria-label={t('research.title')} className="h-auto w-full flex-wrap justify-start gap-1 p-1 sm:w-auto">
        {[...categories, 'models'].map((section) => <TabsTrigger className="min-h-10 whitespace-normal text-left" key={section} value={section}>{t(`research.sections.${section}`)}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="construction" className="space-y-4">
        {chart('construction-pmi', ['construction_pmi_activity', 'construction_pmi_orders', 'construction_pmi_employment'], 50)}
        {chart('construction-annual', ['construction_value_added', 'construction_qualified_profits'])}
      </TabsContent>
      <TabsContent value="real_estate" className="space-y-4">
        {chart('property-growth', property.map((id): ResearchSeries => `real_estate_${id}_yoy`), 0)}
        {chart('property-area', ['real_estate_starts_ytd', 'real_estate_construction_ytd', 'real_estate_completions_ytd', 'real_estate_sales_area_ytd'])}
        {chart('property-amount', ['real_estate_investment_ytd', 'real_estate_sales_value_ytd', 'real_estate_funds_ytd'])}
      </TabsContent>
      <TabsContent value="migrant" className="space-y-4">
        {chart('migrant-count', ['migrant_total', 'migrant_outbound', 'migrant_local', 'migrant_urban', 'migrant_interprovincial'])}
        {chart('migrant-industry', ['migrant_manufacturing_share', 'migrant_construction_share'])}
        {chart('migrant-income', ['migrant_monthly_income'])}
      </TabsContent>
      <TabsContent value="real_economy" className="space-y-4">
        {chart('manufacturing-pmi', ['manufacturing_pmi_production', 'manufacturing_pmi_orders'], 50)}
        {chart('services-pmi', ['services_pmi_activity', 'services_pmi_orders', 'services_pmi_employment'], 50)}
      </TabsContent>
      <TabsContent value="financial">
        <Card>
          <CardHeader>
            <CardTitle>{t('research.sections.financial')}</CardTitle>
            <CardDescription role="status">{t('research.financial_pending')}</CardDescription>
          </CardHeader>
          <CardContent><a className="text-sm underline" href="https://github.com/ZhanZiyuan/china-unemployment-watch/blob/main/docs/financial-data.md">{t('dashboard.source_link')}</a></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="models" className="space-y-4">
        {models ? <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{models.algorithm_version}</Badge>
            <Button size="sm" variant="outline" asChild><a href="/data/research-models.json" download>{t('research.folds')}</a></Button>
            <Button size="sm" variant="ghost" asChild><a href={methodology}>{t('dashboard.methodology')}</a></Button>
          </div>
          {models.pressure.status === 'fetch_failed' && <p role="status">{t('status.fetch_failed')}</p>}
          <MarketChart id="sector-pressure" title={t('research.charts.sector-pressure')} description={t('research.explain.sector-pressure')}
            bounds={bounds} reference={0} series={[{ id: 'sector-pressure', label: t('research.charts.sector-pressure'), color: palette[0],
              frequency: 'monthly', unit: 'score', points: models.pressure.values.map((point) => ({ ...point, status: 'experimental' })) }]} />
          {(['nowcast', 'next_period'] as const).map((horizon) => {
            const { metrics, folds } = models.evaluations[horizon];
            const range = metrics[0];
            const evaluationNote = t('research.evaluation_note', { n: folds.length, first: month(range.first), last: month(range.last) });
            const comparisons: ChartSeries[] = (['actual', ...modelIds] as const).map((id, index) => ({
              id, label: id === 'actual' ? t('research.actual') : id, color: palette[index], frequency: 'monthly', unit: 'percent',
              points: folds.map((fold) => ({
                observation_period: { start: fold.month, end: endOfMonth(fold.month) },
                value: id === 'actual' ? fold.actual : fold.forecasts[id].estimate,
                status: id === 'actual' ? 'observed' : 'experimental',
              })),
            }));
            return <div className="space-y-3" key={horizon}>
              <MarketChart id={`research-${horizon}`} title={t(`research.${horizon}`)} description={evaluationNote}
                series={comparisons} bounds={bounds} />
              <div role="region" aria-label={t(`research.${horizon}`)} tabIndex={0} className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-left text-sm tabular-nums">
                  <thead className="bg-muted/50"><tr>
                    {['model', 'mae', 'rmse', 'direction', 'correlation'].map((key) => <th className="px-3 py-2" key={key} scope="col">{t(`research.table.${key}`)}</th>)}
                  </tr></thead>
                  <tbody>{metrics.map((metric) => <tr key={metric.model} className="border-t">
                    <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">{metric.model} · {t(`research.names.${metric.model}`)}</th>
                    <td className="px-3 py-2">{number(metric.mae)}</td><td className="px-3 py-2">{number(metric.rmse)}</td>
                    <td className="px-3 py-2">{number(metric.direction_accuracy, true)}</td><td className="px-3 py-2">{number(metric.correlation)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>;
          })}
          <p className="text-sm text-muted-foreground">M5 · {t('research.financial_pending')}</p>
          <details className="space-y-3 rounded-xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">{t('research.association')}</summary>
            <p className="text-sm text-muted-foreground">{t('research.association_note')}</p>
            <ul className="space-y-2 text-sm">
              {models.descriptive_lags.filter((lag) => lag.lag === 0).map((lag) => <li key={lag.series_id}>
                {t(`research.series.${lag.series_id}`)} · {number(lag.pearson)} · {t('dashboard.observations', { count: lag.n })} · {month(lag.first)} – {month(lag.last)}
              </li>)}
            </ul>
          </details>
        </> : <p role="status">{t('dashboard.no_data')}</p>}
      </TabsContent>
    </Tabs>
    {research && <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium">{t('dashboard.coverage')}</summary>
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        {Object.entries(research.source_status).map(([id, status]) => <div key={id} className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{t(`research.sources.${id}`)}</h3>
            <Badge variant="outline">{t(`research.states.${status}`)}</Badge></div>
          {research.coverage.filter((row) => researchCatalog[row.series_id].source_id === id).map((row) =>
            <div key={row.series_id} className="text-xs text-muted-foreground">
              <p>{t(`research.series.${row.series_id}`)} · {t('dashboard.observations', { count: row.count })} · {month(row.first)} – {month(row.last)}</p>
              {row.missing.length > 0 && <p>{t('dashboard.missing_periods')} · {format.list(row.missing.map(month))}</p>}
            </div>)}
        </div>)}
        <p className="break-all text-xs text-muted-foreground sm:col-span-2">{t('dashboard.dataset_version')} · {research.dataset_version}</p>
      </div>
    </details>}
  </section>;
}
