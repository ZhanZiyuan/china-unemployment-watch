import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { routing } from '@/i18n/routing';
import '../globals.css';

type Props = LayoutProps<'/[locale]'>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale });
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cuwatch.vercel.app';
  return {
    metadataBase: new URL(canonical),
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `/${locale}`, languages: Object.fromEntries(routing.locales.map((lang) => [lang, `/${lang}`])) },
  };
}

const themeScript = `try {
  const saved = localStorage.getItem('theme');
  const dark = saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch {}`;

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="font-body antialiased">
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
