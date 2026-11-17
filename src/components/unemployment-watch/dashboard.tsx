import { Activity, CalendarDays, CircleAlert, Clock3, Database, Download } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dayNumber, HISTORY_START, INITIAL_END } from '@/lib/market/dates';
import { definitions, indexIds, sourceCatalog, sources, type Dataset, type Health, type SeriesId } from '@/lib/market/schema';
import { MarketChart, type ChartSeries } from './market-chart';

const colors = ['var(--chart-blue)', 'var(--chart-teal)'];

export async function Dashboard({ dataset, health }: { dataset: Dataset | null; health: Health | null }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const date = (value: string | null | undefined) => value
    ? format.dateTime(new Date(dayNumber(value)), { dateStyle: 'medium' }) : t('dashboard.not_available');
  const timestamp = (value: string | null | undefined) => value
    ? format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'medium' }) : t('dashboard.not_available');
  const month = (value: string) => format.dateTime(new Date(dayNumber(value)), { year: 'numeric', month: 'short' });
  const chartSeries = (ids: SeriesId[]): ChartSeries[] => ids.map((id, i) => ({
    ...definitions[id],
    id,
    label: t(`series.${id}`),
    color: colors[i],
    points: dataset?.series.filter((row) => row.series_id === id) ?? [],
  }));
  const national = dataset?.series.filter((row) => row.series_id === 'urban_unemployment' && row.value !== null).at(-1);
  const demand = dataset?.indices.find((index) => index.id === 'employment_demand');
  const range = { start: HISTORY_START, end: dataset?.observation_end ?? HISTORY_START };
  const recentCapture = dataset?.series.map((row) => row.fetched_at).sort().at(-1);
  const hasFailure = health && health.result !== 'success';
  const metadata = [
    { icon: CalendarDays, label: t('dashboard.latest'), value: date(dataset?.observation_end) },
    { icon: Clock3, label: t('dashboard.collection'), value: health ? `${timestamp(health.attempted_at)} (UTC+8)` : t('dashboard.not_available') },
    { icon: Database, label: t('dashboard.quality'), value: dataset ? t(`status.${dataset.quality_status}`) : t('dashboard.not_available') },
  ];

  return (
    <main className="container flex max-w-6xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-8 sm:py-12">
      <section aria-labelledby="page-title" className="flex flex-col items-start justify-between gap-4 border-b pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 id="page-title" className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">{t('title')}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{t('description')}</p>
        </div>
        {dataset && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild><a href="/data/latest.json"><Download />{t('dashboard.data_download')}</a></Button>
            <Button size="sm" variant="ghost" asChild><a href="/data/manifest.json">{t('dashboard.manifest')}</a></Button>
          </div>
        )}
      </section>

      {hasFailure && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-600/40 bg-amber-500/10 p-4 text-sm">
          <CircleAlert className="size-4 shrink-0" />
          {t(health.result === 'invalid' ? 'dashboard.invalid' : 'dashboard.failure')}
          {health.workflow_url && <a href={health.workflow_url} className="underline">{t('dashboard.run_log')}</a>}
        </div>
      )}
      <dl className="grid divide-y rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metadata.map(({ icon: Icon, label, value }) => (
          <div key={label} className="min-w-0 px-4 py-3 sm:px-5">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" />{label}</dt>
            <dd className="mt-2 break-words text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {!dataset?.observation_end ? (
        <p role="status" className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{t('dashboard.no_data')}</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardDescription>{t('series.urban_unemployment')}</CardDescription>
                <CardTitle className="text-4xl font-semibold tabular-nums">{national?.value == null
                  ? t('dashboard.not_available') : format.number(national.value / 100, { style: 'percent', minimumFractionDigits: 1 })}</CardTitle>
                <CardDescription>{national && month(national.observation_period.start)} · {t('frequency.monthly')}</CardDescription>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader>
                <CardDescription>{t('indices.shadow_pressure')}</CardDescription>
                <CardTitle className="text-2xl font-semibold">{t('status.insufficient_data')}</CardTitle>
                <CardDescription>{t('dashboard.method_shadow')}</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <MarketChart id="official-chart" title={t('dashboard.official')} description={t('dashboard.official_explainer')}
            series={chartSeries(['urban_unemployment', 'city_unemployment'])} bounds={range} />
          <MarketChart id="pmi-chart" title={t('dashboard.pmi')} description={t('dashboard.pmi_explainer')} reference={50}
            series={chartSeries(['manufacturing_pmi_employment', 'nonmanufacturing_pmi_employment'])} bounds={range} />
          {demand?.values.length ? (
            <MarketChart id="demand-chart" title={t('indices.employment_demand')} description={t('dashboard.index_explainer')} reference={0}
              series={[{ id: demand.id, label: t('indices.employment_demand'), color: colors[1], frequency: demand.frequency, unit: 'score',
                points: demand.values.map((point) => ({ ...point, status: 'experimental' as const })) }]} bounds={range} />
          ) : null}
          <section aria-label={t('status.insufficient_data')} className="grid gap-3 md:grid-cols-2">
            {indexIds.filter((id) => id === 'search_pressure' || id === 'exam_search').map((id) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
                <p className="text-sm font-semibold">{t(`indices.${id}`)}</p>
                <Badge variant="secondary">{t('status.insufficient_data')}</Badge>
              </div>
            ))}
          </section>
        </>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{t('dashboard.coverage')}</CardTitle>
          <CardDescription>{t('dashboard.history_window', { start: date(HISTORY_START), end: date(INITIAL_END) })}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {sources.map((source) => {
            const info = sourceCatalog[source];
            const state = source === 'nbs-labour' || source === 'nbs-pmi' ? health?.source_status[source] ?? info.access : info.access;
            const coverage = dataset?.coverage.filter((item) => definitions[item.series_id].source === source) ?? [];
            return (
              <div key={source} className="min-w-0 rounded-lg border bg-background/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{t(`sources.${source}`)}</h3>
                  <Badge variant="outline">{t(`status.${state}`)}</Badge>
                  {info.url && <a href={info.url} className="text-xs underline underline-offset-2">{t('dashboard.source_link')}</a>}
                </div>
                {coverage.map((item) => (
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground" key={item.series_id}>
                    <p className="font-medium text-foreground">{t(`series.${item.series_id}`)}</p>
                    <p>{date(item.first)} – {date(item.last)} · {t('dashboard.observations', { count: item.available })}</p>
                    <p>{t('dashboard.latest_capture')} · {timestamp(item.fetched_at)} (UTC+8)</p>
                    {item.missing.length ? <p>{t('dashboard.missing_periods')} · {format.list(item.missing.map((p) => month(p.start)))}</p> : null}
                    {item.not_yet_published && <p>{t('dashboard.awaiting')} · {month(item.not_yet_published.start)}</p>}
                  </div>
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="size-5" />{t('dashboard.methodology')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{t('dashboard.method_baseline')}</p>
            <p>{t('dashboard.method_shadow')}</p>
            <p>{t('dashboard.method_validation')}</p>
          </div>
          {dataset && (
            <dl className="min-w-0 space-y-3 rounded-lg border bg-background/50 p-3 text-xs">
              <div><dt className="text-muted-foreground">{t('dashboard.dataset_version')}</dt><dd className="mt-1 break-all font-mono">{dataset.dataset_version}</dd></div>
              <div><dt className="text-muted-foreground">{t('dashboard.algorithm_version')}</dt><dd>{dataset.algorithm_version}</dd></div>
              <div><dt className="text-muted-foreground">{t('dashboard.latest_capture')}</dt><dd>{timestamp(recentCapture)} (UTC+8)</dd></div>
              <div><dt className="text-muted-foreground">{t('dashboard.revisions')}</dt><dd>{format.number(dataset.revision_count)}</dd></div>
              {dataset.quality_flags.length ? <div><dt className="text-muted-foreground">{t('dashboard.unusual')}</dt><dd>{dataset.quality_flags.length}</dd></div> : null}
            </dl>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
