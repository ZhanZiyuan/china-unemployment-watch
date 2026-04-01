import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:9002');

const themeScript = `
(() => {
  const storageKey = 'theme';
  const root = document.documentElement;
  const storedTheme = localStorage.getItem(storageKey);
  const theme =
    storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'China Unemployment Watch',
    template: '%s | China Unemployment Watch',
  },
  description: '基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标。',
  applicationName: 'China Unemployment Watch',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'China Unemployment Watch',
    description: '基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标。',
    locale: 'zh_CN',
    siteName: 'China Unemployment Watch',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'China Unemployment Watch',
    description: '基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标。',
  },
  robots: {
    follow: true,
    index: true,
  },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
