import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { Dashboard } from '@/components/unemployment-watch/dashboard';
import { MultidimensionalResearch } from '@/components/unemployment-watch/multidimensional-research';
import { readMarketData, readResearchData } from '@/lib/market/read';

export default async function Page({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [data, research] = await Promise.all([readMarketData(), readResearchData()]);
  return (
    <>
      <Header />
      <Dashboard {...data} research={<MultidimensionalResearch {...research} />} />
    </>
  );
}
