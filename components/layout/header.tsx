import { TrendingUp } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { Button } from '../ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block font-headline">
            China Unemployment Watch
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/TrueNine/china-unemployment-watch"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
