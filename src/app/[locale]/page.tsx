import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { Dashboard } from '@/components/unemployment-watch/dashboard';
import { readMarketData } from '@/lib/market/read';

export default async function Page({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await readMarketData();
  return (
    <>
      <Header />
      <Dashboard {...data} />
    </>
  );
}
