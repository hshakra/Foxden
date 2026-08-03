import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRange, RANGES } from "../lib/range";

function Freshness() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(null);

  // recompute every second so "updated Xs ago" stays honest (rule 13)
  useEffect(() => {
    function update() {
      const updatedAt = queryClient
        .getQueryCache()
        .getAll()
        .reduce((latest, q) => Math.max(latest, q.state.dataUpdatedAt || 0), 0);
      if (!updatedAt) {
        setLabel(null);
        return;
      }
      const secs = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
      setLabel(secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [queryClient]);

  if (!label) return null;
  return (
    <span className="font-mono text-[10px] text-ink-3 tabular-nums">
      updated {label} ago
    </span>
  );
}

export function TopBar({ title, subtitle, children }) {
  const { days, setDays } = useRange();

  return (
    <div className="flex items-center gap-3.5 border-b border-line px-5 py-3">
      <div className="leading-tight">
        <h1 className="text-[15px] font-bold">{title}</h1>
        {subtitle && (
          <p className="font-mono text-[10px] text-ink-3">{subtitle}</p>
        )}
      </div>

      {children}

      <button
        type="button"
        className="ml-auto flex min-w-[210px] items-center gap-2 rounded-lg border border-line bg-surface-1 px-3 py-1.5 text-left text-xs text-ink-3 hover:border-line-2 hover:text-ink-2"
      >
        <Search size={13} />
        Search IOC, family, or tag
        <kbd className="ml-auto rounded border border-line-2 px-1.5 font-mono text-[10px]">
          /
        </kbd>
      </button>

      <div
        className="flex overflow-hidden rounded-lg border border-line"
        role="radiogroup"
        aria-label="Time range"
      >
        {RANGES.map(({ days: d, label }) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={days === d}
            onClick={() => setDays(d)}
            className={`px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
              days === d
                ? "bg-accent text-white"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-good">
        <span className="live-pulse h-[7px] w-[7px] rounded-full bg-good" />
        LIVE
      </span>

      <Freshness />
    </div>
  );
}
