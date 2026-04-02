'use client';

import { useEffect } from 'react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-border/70 bg-card p-8 shadow-xs">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Dashboard Error
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
          页面暂时加载失败
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          这通常是一次临时渲染或数据读取异常。刷新后大概率可以恢复；如果持续出现，再检查静态数据文件和构建日志。
        </p>
        <button
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          onClick={reset}
          type="button"
        >
          重试渲染
        </button>
      </div>
    </div>
  );
}
