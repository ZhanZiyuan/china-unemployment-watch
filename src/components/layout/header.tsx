'use client';

import { TrendingUp } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Button } from '../ui/button';

const localeNames = { en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文' };

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
      <div className="container flex min-h-16 items-center justify-between gap-1 px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <TrendingUp className="h-5 w-5 shrink-0 text-primary" />
          <span className="text-sm font-bold leading-tight sm:text-base">
            {t('nav.brand')}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <ThemeToggle />
          <select
            aria-label={t('nav.language')}
            value={locale}
            onChange={(event) => {
              const next = routing.locales.find((lang) => lang === event.target.value);
              if (next) router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: next });
            }}
            className="max-w-28 rounded-md border bg-background px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-primary"
          >
            {routing.locales.map((lang) => <option key={lang} value={lang} lang={lang}>{localeNames[lang]}</option>)}
          </select>
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/ZhanZiyuan/china-unemployment-watch"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('nav.github')}
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.22.72-.5v-1.74c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.17-1.52-1.17-1.52-.96-.64.07-.63.07-.63 1.06.08 1.62 1.08 1.62 1.08.94 1.6 2.47 1.14 3.07.87.1-.67.37-1.14.66-1.4-2.35-.26-4.82-1.16-4.82-5.18 0-1.14.41-2.06 1.08-2.79-.11-.26-.47-1.33.1-2.77 0 0 .88-.28 2.89 1.06a10.1 10.1 0 0 1 5.26 0c2-1.34 2.88-1.06 2.88-1.06.58 1.44.22 2.51.11 2.77.67.73 1.08 1.65 1.08 2.79 0 4.03-2.47 4.92-4.83 5.17.38.32.72.95.72 1.92v2.84c0 .28.2.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
              </svg>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
