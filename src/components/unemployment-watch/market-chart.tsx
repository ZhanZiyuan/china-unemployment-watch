'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Brush, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dayNumber, endOfMonth, isoDay, shiftMonth } from '@/lib/market/dates';
import type { Observation } from '@/lib/market/schema';

export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  frequency: Observation['frequency'];
  unit: Observation['unit'] | 'score';
  points: {
    observation_period: Observation['observation_period'];
    value: number | null;
    status: Observation['status'] | 'experimental';
    source_url?: string;
  }[];
};

type Bounds = { start: string; end: string };
type PlotRow = { date: number; readings: Record<string, ChartSeries['points'][number]> };
type Props = {
  id: string;
  title: string;
  description: string;
  series: ChartSeries[];
  bounds: Bounds;
  reference?: number;
};

const touchQuery = '(pointer: coarse)';

function subscribePointer(onChange: () => void) {
  const query = window.matchMedia(touchQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function MarketChart({ id, title, description, series, bounds, reference }: Props) {
  const [range, setRange] = useState(bounds);
  const [hidden, setHidden] = useState<string[]>([]);
  const touch = useSyncExternalStore(subscribePointer, () => window.matchMedia(touchQuery).matches, () => false);
  const t = useTranslations();
  const format = useFormatter();
  const visible = series.filter((item) => !hidden.includes(item.id));
  const formatDate = (value: string | number, compact = false) => format.dateTime(new Date(
    typeof value === 'string' ? dayNumber(value) : value,
  ), compact ? { year: '2-digit', month: 'short' } : { dateStyle: 'medium' });
  const full = useMemo(() => {
    const byDate = new Map<string, PlotRow>();
    function rowFor(day: string) {
      const found = byDate.get(day);
      if (found) return found;
      const row: PlotRow = { date: dayNumber(day), readings: {} };
      byDate.set(day, row);
      return row;
    }
    for (const item of series) {
      if (item.frequency === 'monthly') {
        // Existing period anchors with no reading provide line breaks in the chart.
        for (let month = shiftMonth(bounds.start, 0); endOfMonth(month) <= bounds.end; month = shiftMonth(month, 1)) {
          rowFor(endOfMonth(month));
        }
      }
      for (const point of item.points) rowFor(point.observation_period.end).readings[item.id] = point;
    }
    return [...byDate.values()].sort((a, b) => a.date - b.date);
  }, [series, bounds]);
  const lo = dayNumber(range.start);
  const hi = dayNumber(range.end);
  const rows = full.filter((row) => row.date >= lo && row.date <= hi);
  const hasData = rows.some((row) => visible.some((item) => row.readings[item.id]?.value != null));
  const brushDates = [...new Set([dayNumber(bounds.start), ...full.map((row) => row.date), lo, hi])].sort((a, b) => a - b);
  const brush = brushDates.map((date) => ({ date }));
  const period = (p: Observation['observation_period']) => {
    if (p.start === p.end) return formatDate(p.start);
    return `${formatDate(p.start)} – ${formatDate(p.end)}`;
  };

  function updateRange(next: Bounds) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(next.start) && /^\d{4}-\d{2}-\d{2}$/.test(next.end) &&
        next.start >= bounds.start && next.end <= bounds.end && next.start <= next.end) setRange(next);
  }

  function zoom(factor: number) {
    const day = 86_400_000;
    const nextDays = Math.max(factor > 1 ? 1 : 0, Math.round((hi - lo) / day * factor));
    const midpoint = Math.round((lo + hi) / (2 * day)) * day;
    updateRange({
      start: isoDay(Math.max(dayNumber(bounds.start), midpoint - Math.floor(nextDays / 2) * day)),
      end: isoDay(Math.min(dayNumber(bounds.end), midpoint + Math.ceil(nextDays / 2) * day)),
    });
  }

  return (
    <Card id={id} data-testid={id} className="min-w-0 scroll-mt-20 rounded-xl">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-xl"><h2>{title}</h2></CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/45 p-3">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            {t('chart.from')}
            <input type="date" aria-label={t('chart.from')} className="h-9 max-w-full rounded-md border bg-card px-2 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
              min={bounds.start} max={range.end} value={range.start} onChange={(event) => updateRange({ ...range, start: event.target.value })} />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
            {t('chart.to')}
            <input type="date" aria-label={t('chart.to')} className="h-9 max-w-full rounded-md border bg-card px-2 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
              min={range.start} max={bounds.end} value={range.end} onChange={(event) => updateRange({ ...range, end: event.target.value })} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => zoom(0.5)} disabled={lo === hi}>{t('chart.zoom_in')}</Button>
            <Button size="sm" variant="outline" onClick={() => zoom(2)} disabled={range.start === bounds.start && range.end === bounds.end}>{t('chart.zoom_out')}</Button>
            <Button size="sm" variant="ghost" onClick={() => setRange(bounds)}>{t('chart.reset')}</Button>
          </div>
        </div>
        <div aria-label={t('chart.legend')} role="group" className="flex flex-wrap gap-2">
          {series.map((item) => (
            <Button key={item.id} size="sm" variant="outline" aria-pressed={!hidden.includes(item.id)} onClick={() => {
              setHidden((previous) => previous.includes(item.id) ? previous.filter((key) => key !== item.id) : [...previous, item.id]);
            }} className="h-auto min-h-9 max-w-full whitespace-normal rounded-full px-3 text-left text-xs text-muted-foreground aria-pressed:border-primary/30 aria-pressed:bg-primary/5 aria-pressed:text-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
              {item.label}
            </Button>
          ))}
        </div>
        <div className="relative h-56 w-full sm:h-72">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 224 }}>
              <LineChart data={rows} margin={{ top: 10, bottom: 4, right: 14, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis type="number" dataKey="date" domain={lo === hi ? [lo - 43_200_000, hi + 43_200_000] : [lo, hi]}
                  tickFormatter={(tick) => formatDate(tick, hi - lo > 62 * 86_400_000)} minTickGap={30}
                  ticks={lo === hi ? [lo] : undefined} axisLine={false} tickLine={false} tickMargin={8}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis width={42} domain={['auto', 'auto']} axisLine={false} tickLine={false} tickMargin={8}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={(tick) => format.number(tick, { maximumFractionDigits: 2 })} />
                {reference !== undefined && <ReferenceLine y={reference} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />}
                <Tooltip trigger={touch ? "click" : "hover"} content={({ active, label }) => {
                  const row = active ? rows.find((point) => point.date === Number(label)) : undefined;
                  if (!row) return null;
                  const readings = visible.flatMap((item) => {
                    const reading = row.readings[item.id];
                    return reading?.value == null ? [] : [{ item, reading, value: reading.value }];
                  });
                  if (!readings.length) return null;
                  return (
                    <div className="max-w-[min(19rem,75vw)] space-y-2 rounded-lg border bg-popover p-3 text-xs shadow">
                      <p className="font-semibold">{period(readings[0].reading.observation_period)}</p>
                      {readings.map(({ item, reading, value }) => (
                        <div key={item.id}>
                          <p>{item.label} <strong>{format.number(value, { maximumFractionDigits: 4 })} {t(`units.${item.unit}`)}</strong></p>
                          <p className="text-muted-foreground">{t(`status.${reading.status}`)} · {t(`frequency.${item.frequency}`)}</p>
                          {reading.source_url
                            ? <a className="underline" href={reading.source_url} target="_blank" rel="noreferrer">{t('chart.release')}</a>
                            : <p>{t('chart.derived')}</p>}
                        </div>
                      ))}
                    </div>
                  );
                }} />
                {visible.map((item) => (
                  <Line key={item.id} name={item.label} type="linear" stroke={item.color} strokeWidth={2}
                    dataKey={(row: PlotRow) => row.readings[item.id]?.value ?? null} dot={{ r: rows.length > 22 ? 2 : 3 }}
                    activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div role="status" className="grid h-full place-items-center rounded-lg border border-dashed px-3 text-center text-sm text-muted-foreground">
              {t(visible.length ? 'chart.no_points' : 'chart.all_hidden')}
            </div>
          )}
        </div>
        {brush.length > 1 && (
          <ResponsiveContainer width="100%" height={34} minWidth={0} initialDimension={{ width: 320, height: 34 }}>
            <LineChart data={brush} margin={{ top: 0, right: 9, left: 9, bottom: 0 }}>
              <Brush dataKey="date" ariaLabel={t('chart.brush')} height={28} travellerWidth={13}
                tickFormatter={(tick) => formatDate(tick, true)} stroke="var(--color-muted-foreground)" fill="var(--color-muted)"
                startIndex={brushDates.indexOf(lo)} endIndex={brushDates.indexOf(hi)}
                onChange={({ startIndex, endIndex }) => {
                  if (startIndex === undefined || endIndex === undefined) return;
                  updateRange({ start: isoDay(brushDates[startIndex]), end: isoDay(brushDates[endIndex]) });
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-muted-foreground">
          {t('chart.range_label', { start: formatDate(range.start), end: formatDate(range.end) })}
          {' · '}{t(`frequency.${series[0].frequency}`)} · {t('chart.period_end')}
        </p>
        {range.start === range.end && hasData && (
          <ul className="flex flex-wrap gap-2 text-sm" aria-label={formatDate(range.start)}>
            {visible.map((item) => {
              const reading = rows[0]?.readings[item.id];
              if (reading?.value == null) return null;
              return <li key={item.id}>{item.label} <strong>{format.number(reading.value, { maximumFractionDigits: 4 })} {t(`units.${item.unit}`)}</strong></li>;
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
