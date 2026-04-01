import { GitBranch, TrendingUp } from 'lucide-react';
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
              <GitBranch className="h-5 w-5" />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
