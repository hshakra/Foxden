import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ArrowLeft } from "lucide-react";
import { useRange, RANGES } from "../lib/range";
import { useLookup } from "../lib/lookup";

function Freshness() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState(null);

  // recompute every second so the label stays accurate
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
    <span className="hidden text-secondary text-ink-low tabular-nums md:inline">
      Updated {label} ago
    </span>
  );
}

// page header, title and description on the left, controls on the right
// descriptionExtra renders beside the description, the overview uses it
// for the new since last visit link
export function TopBar({ title, subtitle, descriptionExtra, crumbs, children }) {
  const { days, setDays } = useRange();
  const { openLookup } = useLookup();

  return (
    <div className="flex items-center gap-4 border-b border-line px-6 py-4">
      {crumbs?.length > 0 && (
        <Link
          to={crumbs[0].to}
          aria-label={`Back to ${crumbs[0].label}`}
          className="rounded-md border border-line p-1.5 text-ink-low transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          <ArrowLeft size={14} />
        </Link>
      )}
      <div className="min-w-0">
        {crumbs?.length > 0 && (
          <p className="text-meta text-ink-low">
            {crumbs.map((c, i) => (
              <span key={c.label}>
                {i > 0 && " / "}
                {c.to ? (
                  <Link to={c.to} className="hover:text-accent-soft">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </span>
            ))}
          </p>
        )}
        <h1 className="truncate text-display font-medium tracking-tight">
          {title}
        </h1>
        {(subtitle || descriptionExtra) && (
          <p className="flex items-center gap-3 text-secondary text-ink-mid">
            {subtitle}
            {descriptionExtra}
          </p>
        )}
      </div>

      {children}

      <button
        type="button"
        onClick={openLookup}
        className="ml-auto hidden min-w-0 items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 text-left text-secondary text-ink-low transition-colors duration-150 hover:border-line-strong hover:text-ink-mid md:flex lg:min-w-[210px]"
      >
        <Search size={13} className="shrink-0" />
        <span className="truncate">Search IOC, family, or tag</span>
        <kbd className="ml-auto rounded border border-line-strong px-1.5 font-mono text-meta">
          /
        </kbd>
      </button>

      <div
        className="flex shrink-0 overflow-hidden rounded-md border border-line"
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
            className={`px-2.5 py-1.5 text-secondary transition-colors duration-150 ${
              days === d
                ? "bg-accent font-medium text-white"
                : "text-ink-mid hover:bg-lifted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Freshness />
    </div>
  );
}
