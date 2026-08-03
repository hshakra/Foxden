import { RefreshCw, SearchX } from "lucide-react";

/* Content-shaped loading placeholder (rule 9 — no generic spinners). */
export function Skeleton({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded-md bg-surface-2 ${className}`}
    />
  );
}

/* A stack of row-shaped skeletons for feeds/tables. */
export function SkeletonRows({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-5 w-14" />
          <Skeleton className={`h-3.5 ${i % 2 ? "w-2/5" : "w-1/2"}`} />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="ml-auto h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/* Empty state: explain + offer a next action (rule 9). */
export function EmptyState({ title, hint, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-2 px-6 py-10 text-center">
      <SearchX size={20} className="text-ink-3" />
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="text-xs text-ink-2">{hint}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-lg border border-line-2 bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-soft"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Error state: plain language + retry path (rule 9). */
export function ErrorState({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-xl border border-bad/30 bg-bad/5 px-6 py-10 text-center"
    >
      <p className="text-sm font-semibold">Couldn't load this data</p>
      <p className="max-w-md font-mono text-[11px] text-ink-2">
        {error?.message ?? "Something went wrong talking to the feed."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface-2 px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent-soft"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
