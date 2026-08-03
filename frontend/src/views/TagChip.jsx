import { Link } from "react-router-dom";

export function TagChip({ tag, count }) {
  return (
    <Link
      to={`/tag/${encodeURIComponent(tag)}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-t-domain/25 bg-t-domain/10 px-2.5 py-1 font-mono text-[10px] text-t-domain transition-colors hover:border-accent/60 hover:text-accent-soft"
    >
      {tag}
      <b className="text-ink-2 tabular-nums">{count}</b>
    </Link>
  );
}
