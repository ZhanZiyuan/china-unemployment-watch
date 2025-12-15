import { Header } from '@/components/layout/header';
import { MainChart } from '@/components/unemployment-watch/main-chart';
import { MetricCards } from '@/components/unemployment-watch/metric-cards';
import { MethodologyCard } from '@/components/unemployment-watch/methodology-card';
import { KeywordsCard } from '@/components/unemployment-watch/keywords-card';
import { getTrendsData, type DataPoint } from '@/lib/data';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600; // Revalidate data every hour

async function Page() {
  const data: DataPoint[] = await getTrendsData();

  const currentStatus = (() => {
    if (!data || data.length < 2) {
      return { index: 0, change: 0, date: new Date().toISOString().split('T')[0] };
    }
    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const change = latest.compositeIndex - prev.compositeIndex;
    return {
      index: latest.compositeIndex,
      change: parseFloat(change.toFixed(1)),
      date: latest.date,
    };
  })();

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Header />
      <main className="container flex flex-1 flex-col gap-8 py-8">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline text-foreground">
            中国就业市场影子指数
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <p className="text-muted-foreground max-w-2xl">
              基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标 (2021 - 至今)。
            </p>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 hidden sm:inline-flex">
              仅供研究参考
            </Badge>
          </div>
        </div>
        
        <MetricCards currentStatus={currentStatus} />

        <MainChart data={data} />

        <div className="grid gap-8 lg:grid-cols-2">
          <MethodologyCard />
          <KeywordsCard />
        </div>

        <footer className="pt-8 border-t text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} China Unemployment Watch. All rights reserved.</p>
          <p className="mt-2 text-xs">
            免责声明: 本项目为基于公开搜索热度的数据可视化实验，并非官方经济统计数据。
          </p>
        </footer>
      </main>
    </div>
  );
}

export default Page;
