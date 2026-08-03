import { Link } from "react-router-dom";

export function FamilyCard({ rank, name, count, max }) {
  return (
    <Link
      to={`/family/${encodeURIComponent(name)}`}
      className="flex items-center gap-2.5 border-b border-line py-1.5 text-xs last:border-0 hover:bg-surface-2/50"
    >
      <span className="w-4 font-mono text-[10px] text-ink-3 tabular-nums">
        {rank}
      </span>
      <span className="truncate font-medium text-ink">{name}</span>
      <span className="ml-auto h-[5px] w-20 shrink-0 overflow-hidden rounded-sm bg-surface-0">
        <span
          className="block h-full bg-gradient-to-r from-accent to-accent-soft"
          style={{ width: `${Math.round((count / max) * 100)}%` }}
        />
      </span>
      <span className="w-9 text-right font-mono text-[10px] text-ink-2 tabular-nums">
        {count}
      </span>
    </Link>
  );
}
