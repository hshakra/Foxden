import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, ChevronDown } from "lucide-react";
import { sortRecentStream } from "../utils/processor";
import { IOCCard } from "../views/IOCCard";
import { EmptyState } from "./states";

/*
  The working surface: newest-first IOC stream with
  - filter chips that show their state (recognition over recall)
  - same-family bursts clustered behind an expandable row (rule 12)
  - virtualized rows past the first screenful (rule 14)
*/

const TYPE_FILTERS = ["all", "ip:port", "domain", "url", "hash"];
const CLUSTER_MIN = 4;

function buildDisplayItems(stream, expanded) {
  const items = [];
  let run = [];

  function flushRun() {
    if (run.length >= CLUSTER_MIN) {
      const id = `${run[0].malware_printable}-${run[0].id}`;
      items.push({ kind: "cluster", id, family: run[0].malware_printable, iocs: run });
      if (expanded.has(id)) {
        for (const ioc of run) items.push({ kind: "ioc", ioc, inCluster: true });
      }
    } else {
      for (const ioc of run) items.push({ kind: "ioc", ioc });
    }
    run = [];
  }

  for (const ioc of stream) {
    if (run.length && ioc.malware_printable !== run[0].malware_printable) {
      flushRun();
    }
    run.push(ioc);
  }
  flushRun();
  return items;
}

export function FeedTable({ iocs, selectedId, onSelect }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [minConf, setMinConf] = useState(0);
  const [expanded, setExpanded] = useState(() => new Set());
  const scrollRef = useRef(null);

  const stream = useMemo(() => sortRecentStream(iocs), [iocs]);

  const filtered = useMemo(() => {
    return stream.filter((ioc) => {
      if (typeFilter === "hash" && !ioc.ioc_type.endsWith("_hash")) return false;
      if (typeFilter !== "all" && typeFilter !== "hash" && ioc.ioc_type !== typeFilter)
        return false;
      if ((Number(ioc.confidence_level) || 0) < minConf) return false;
      return true;
    });
  }, [stream, typeFilter, minConf]);

  const items = useMemo(
    () => buildDisplayItems(filtered, expanded),
    [filtered, expanded],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 37,
    overscan: 12,
  });

  function cycleType() {
    const next =
      TYPE_FILTERS[(TYPE_FILTERS.indexOf(typeFilter) + 1) % TYPE_FILTERS.length];
    setTypeFilter(next);
  }

  function toggleCluster(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Live IOC feed</h4>
        <span className="font-mono text-[10px] text-ink-3">
          newest first · {filtered.length.toLocaleString()} IOCs
        </span>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={cycleType}
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
            typeFilter === "all"
              ? "border-line-2 bg-surface-2 text-ink-2"
              : "border-accent/50 bg-accent/10 text-accent-soft"
          }`}
        >
          type: {typeFilter} ▾
        </button>
        <button
          type="button"
          onClick={() => setMinConf(minConf ? 0 : 50)}
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
            minConf === 0
              ? "border-line-2 bg-surface-2 text-ink-2"
              : "border-accent/50 bg-accent/10 text-accent-soft"
          }`}
        >
          {minConf ? `confidence ≥ ${minConf} ×` : "confidence: all"}
        </button>
      </div>

      <div
        role="table"
        aria-label="Live IOC feed"
        className="grid grid-cols-[70px_minmax(0,1fr)_130px_120px_42px_26px] gap-2.5 border-b border-line-2 px-2 pb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-3"
      >
        <span>Type</span>
        <span>Indicator</span>
        <span>Family</span>
        <span>Confidence</span>
        <span>Seen</span>
        <span />
      </div>

      {items.length === 0 ? (
        <div className="pt-3">
          <EmptyState
            title="No IOCs match these filters"
            hint="Try widening the time range or clearing a filter."
            actionLabel="Clear filters"
            onAction={() => {
              setTypeFilter("all");
              setMinConf(0);
            }}
          />
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[520px] overflow-y-auto">
          <div
            className="relative w-full"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const item = items[vRow.index];
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${vRow.start}px)` }}
                >
                  {item.kind === "cluster" ? (
                    <button
                      type="button"
                      onClick={() => toggleCluster(item.id)}
                      className="my-1 flex w-full items-center gap-2 rounded-md border border-dashed border-line-2 bg-surface-1 px-2.5 py-1.5 text-left font-mono text-[10.5px] text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
                    >
                      {expanded.has(item.id) ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      <b className="text-ink">{item.family}</b>
                      <span>
                        · {item.iocs.length} IOCs in a burst —{" "}
                        {expanded.has(item.id) ? "collapse" : "expand"}
                      </span>
                    </button>
                  ) : (
                    <div className={item.inCluster ? "pl-5" : ""}>
                      <IOCCard
                        ioc={item.ioc}
                        selected={selectedId === item.ioc.id}
                        onSelect={() => onSelect?.(item.ioc)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
