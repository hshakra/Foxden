import { useEffect, useState } from "react";
import { RefreshCw, SearchX } from "lucide-react";

// loading placeholder shaped like the real content, no generic spinners
export function Skeleton({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded-md bg-lifted ${className}`}
    />
  );
}

// after a while a quiet line explains the wait, free hosting wakes servers
// cold and threatfox has slow days, the skeleton alone reads as frozen
// once a load drags past a few seconds
function SlowNote({ delay = 3000 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  if (!show) return null;
  return (
    <p className="pt-4 text-center text-secondary text-ink-mid">
      This is taking longer than usual. The server is likely waking up from a
      cold start on free hosting, still trying.
    </p>
  );
}

// a stack of row shaped skeletons matching the 40px table spec
export function SkeletonRows({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-10 items-center gap-3 border-b border-line">
          <Skeleton className="h-5 w-14" />
          <Skeleton className={`h-3.5 ${i % 2 ? "w-2/5" : "w-1/2"}`} />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="ml-auto h-3.5 w-16" />
        </div>
      ))}
      <SlowNote />
    </div>
  );
}

// empty state explains what happened and offers a next step
export function EmptyState({ icon: Icon = SearchX, title, hint, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <Icon size={20} className="text-ink-low" />
      <p className="text-body font-medium">{title}</p>
      {hint && <p className="text-secondary text-ink-mid">{hint}</p>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-md border border-line bg-lifted px-3 py-1.5 text-secondary font-medium transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// error state in plain language with a retry button
export function ErrorState({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-conf-low/30 bg-conf-low/5 px-6 py-10 text-center"
    >
      <p className="text-body font-medium">Couldn't load this data</p>
      <p className="max-w-md font-mono text-meta text-ink-mid">
        {error?.message ?? "Something went wrong talking to the feed."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-line bg-lifted px-3 py-1.5 text-secondary font-medium transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
