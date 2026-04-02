function LoadingCard() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-6">
      <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
      <div className="mt-4 h-10 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="mt-3 h-3 w-36 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-svh bg-background">
      <div className="container flex min-h-svh flex-col gap-8 py-8">
        <div className="space-y-3">
          <div className="h-10 w-56 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-muted" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-6">
          <div className="h-[380px] animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
