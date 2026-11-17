import { Download, FileText } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { dayNumber } from '@/lib/market/dates';
import type { Manifest } from '@/lib/market/schema';

export async function ManifestDialog({ manifest }: { manifest: Manifest }) {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const date = (value: string) => format.dateTime(new Date(dayNumber(value)), { dateStyle: 'medium' });
  const range = manifest.observation_end
    ? t('chart.range_label', { start: date(manifest.observation_start), end: date(manifest.observation_end) })
    : t('dashboard.not_available');
  const generatedAt = format.dateTime(new Date(manifest.generated_at), { dateStyle: 'medium', timeStyle: 'medium' });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-center">
          <FileText aria-hidden="true" />
          {t('dashboard.manifest')}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t('manifest.close')}
        className="max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl p-5 sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{t('dashboard.manifest')}</DialogTitle>
          <DialogDescription>{t('manifest.description')}</DialogDescription>
        </DialogHeader>
        <dl className="grid min-w-0 gap-x-5 gap-y-4 rounded-lg border bg-muted/50 p-4 text-sm sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t('dashboard.dataset_version')}</dt>
            <dd className="mt-1 break-all font-mono">{manifest.dataset_version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('dashboard.algorithm_version')}</dt>
            <dd className="mt-1 font-mono">{manifest.algorithm_version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('manifest.schema_version')}</dt>
            <dd className="mt-1 font-mono">{manifest.schema_version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('manifest.coverage')}</dt>
            <dd className="mt-1">{range}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('manifest.generated_at')}</dt>
            <dd className="mt-1 tabular-nums"><time dateTime={manifest.generated_at}>{generatedAt}</time> (UTC+8)</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('dashboard.quality')}</dt>
            <dd className="mt-1"><Badge variant="secondary">{t(`status.${manifest.quality_status}`)}</Badge></dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs text-muted-foreground">{t('manifest.checksum')}</dt>
            <dd className="mt-1 break-all font-mono">{manifest.sha256}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button asChild>
            <a href="/data/manifest.json" download="manifest.json">
              <Download aria-hidden="true" />
              {t('manifest.download')}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
