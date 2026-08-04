import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, X, Shield, Tag } from "lucide-react";
import { useWatchlist, toggleWatch } from "../lib/watchlist";

// the pinned strip on the overview
// shows each watched family or tag with its activity in the current range
export function Watchlist({ iocs }) {
  const watchlist = useWatchlist();

  const counts = useMemo(() => {
    const byFamily = {};
    const byTag = {};
    for (const ioc of iocs) {
      byFamily[ioc.malware_printable] =
        (byFamily[ioc.malware_printable] || 0) + 1;
      for (const tag of ioc.tags ?? []) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }
    return { family: byFamily, tag: byTag };
  }, [iocs]);

  if (watchlist.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
          <Star size={11} className="text-accent-soft" /> Watchlist
        </span>
        {watchlist.map((w) => {
          const count = counts[w.kind]?.[w.name] ?? 0;
          const to =
            w.kind === "family"
              ? `/family/${encodeURIComponent(w.name)}`
              : `/tag/${encodeURIComponent(w.name)}`;
          const Icon = w.kind === "family" ? Shield : Tag;
          return (
            <span
              key={`${w.kind}:${w.name}`}
              className="flex items-center overflow-hidden rounded-lg border border-line-2 bg-surface-2"
            >
              <Link
                to={to}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink hover:text-accent-soft"
              >
                <Icon size={11} className="text-ink-3" />
                {w.name}
                <b
                  className={`font-mono text-[10px] tabular-nums ${
                    count > 0 ? "text-accent-soft" : "text-ink-3"
                  }`}
                >
                  {count}
                </b>
              </Link>
              <button
                type="button"
                onClick={() => toggleWatch(w.kind, w.name)}
                aria-label={`Remove ${w.name} from watchlist`}
                className="border-l border-line px-1.5 py-1.5 text-ink-3 hover:text-bad"
              >
                <X size={11} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
