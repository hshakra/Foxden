import { Star } from "lucide-react";
import { useWatchlist, toggleWatch } from "../lib/watchlist";

// pin a family or tag to the overview watchlist
export function WatchButton({ kind, name }) {
  const watchlist = useWatchlist();
  const watched = watchlist.some((w) => w.kind === kind && w.name === name);

  return (
    <button
      type="button"
      onClick={() => toggleWatch(kind, name)}
      aria-pressed={watched}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
        watched
          ? "border-accent/50 bg-accent/10 text-accent-soft"
          : "border-line-2 bg-surface-2 text-ink-2 hover:border-accent hover:text-accent-soft"
      }`}
    >
      <Star size={12} fill={watched ? "currentColor" : "none"} />
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
