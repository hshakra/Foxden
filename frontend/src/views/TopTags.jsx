import { useMemo } from "react";
import { Link } from "react-router-dom";
import { rankTags } from "../utils/processor";

// ranked tag list for the overview, bars instead of a chip pile
export function TopTags({ iocs }) {
  const data = useMemo(() => rankTags(iocs), [iocs]);
  const max = data[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Trending tags</h4>
        <span className="font-mono text-[10px] text-ink-3">
          most used in range
        </span>
        <Link
          to="/tags"
          className="ml-auto font-mono text-[10px] text-accent-soft hover:underline"
        >
          all tags
        </Link>
      </div>
      <div>
        {data.map((t, i) => (
          <Link
            key={t.tag}
            to={`/tag/${encodeURIComponent(t.tag)}`}
            className="flex items-center gap-2.5 border-t border-line py-1.5 text-xs hover:bg-surface-2/50"
          >
            <span className="w-4 font-mono text-[10px] text-ink-3 tabular-nums">
              {i + 1}
            </span>
            <span
              className="truncate font-mono text-[10.5px] text-t-domain"
              title={t.tag}
            >
              {t.tag}
            </span>
            <span className="ml-auto h-[5px] w-24 shrink-0 overflow-hidden rounded-sm bg-surface-0">
              <span
                className="block h-full bg-gradient-to-r from-accent to-accent-soft"
                style={{ width: `${Math.round((t.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-9 text-right font-mono text-[10px] text-ink-2 tabular-nums">
              {t.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
