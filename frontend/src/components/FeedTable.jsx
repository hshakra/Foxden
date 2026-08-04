import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Download,
  Search,
} from "lucide-react";
import { sortRecentStream } from "../utils/processor";
import { THREAT_LABELS } from "../lib/colors";
import { IOCCard } from "../views/IOCCard";
import { EmptyState } from "./states";

// the main feed, newest first
// dropdown filters that always show their state, bursts collapse into
// cluster rows, only the first page renders until you ask for more,
// and j k enter esc drive the keyboard

const TYPES = ["ip:port", "domain", "url", "hash"];
const CONF_PRESETS = [
  { label: "all", value: 0 },
  { label: "50 and up", value: 50 },
  { label: "75 and up", value: 75 },
  { label: "100 only", value: 100 },
];
const CLUSTER_MIN = 4;
const PAGE = 100;

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

function isTypingTarget(el) {
  return (
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

// a filter chip that opens a small panel underneath
function FilterMenu({ label, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-colors ${
          active
            ? "border-accent/50 bg-accent/10 text-accent-soft"
            : "border-line-2 bg-surface-2 text-ink-2 hover:text-ink"
        }`}
      >
        {label} <ChevronDown size={10} className="inline" />
      </button>
      {open && (
        <span className="absolute left-0 top-8 z-20 flex w-52 flex-col overflow-hidden rounded-lg border border-line-2 bg-surface-3 py-1 shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

function MenuItem({ checked, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[10.5px] text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      <span className="grid h-3.5 w-3.5 shrink-0 place-content-center rounded border border-line-2">
        {checked && <Check size={10} className="text-accent-soft" />}
      </span>
      {children}
    </button>
  );
}

function exportCsv(rows) {
  const head = "ioc,type,family,confidence,first_seen,tags";
  const lines = rows.map((r) =>
    [
      `"${r.ioc.replaceAll('"', '""')}"`,
      r.ioc_type,
      `"${(r.malware_printable ?? "").replaceAll('"', '""')}"`,
      r.confidence_level,
      r.first_seen,
      `"${(r.tags ?? []).join(" ")}"`,
    ].join(","),
  );
  const blob = new Blob([[head, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "foxden-iocs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function FeedTable({
  iocs,
  selectedId,
  onSelect,
  familyFilter,
  onFamilyFilterChange,
  typeFilter = [],
  onTypeFilterChange,
  threatFilter = [],
  onThreatFilterChange,
  title = "Live IOC feed",
  cluster = true,
}) {
  const [minConf, setMinConf] = useState(0);
  const [familySearch, setFamilySearch] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [limit, setLimit] = useState(PAGE);
  const scrollRef = useRef(null);

  const stream = useMemo(() => sortRecentStream(iocs), [iocs]);

  const filtered = useMemo(() => {
    return stream.filter((ioc) => {
      if (typeFilter.length) {
        const t = ioc.ioc_type.endsWith("_hash") ? "hash" : ioc.ioc_type;
        if (!typeFilter.includes(t)) return false;
      }
      if (threatFilter.length && !threatFilter.includes(ioc.threat_type))
        return false;
      if ((Number(ioc.confidence_level) || 0) < minConf) return false;
      if (familyFilter && ioc.malware_printable !== familyFilter) return false;
      return true;
    });
  }, [stream, typeFilter, threatFilter, minConf, familyFilter]);

  // families present in the current data, for the family picker
  const familyOptions = useMemo(() => {
    const counts = {};
    for (const ioc of stream) {
      counts[ioc.malware_printable] = (counts[ioc.malware_printable] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [stream]);

  // threat types actually present in the data, for the threat picker
  const threatOptions = useMemo(() => {
    const seen = new Set();
    for (const ioc of stream) seen.add(ioc.threat_type);
    return [...seen].sort();
  }, [stream]);

  // reset paging whenever the result set changes shape
  useEffect(() => {
    setLimit(PAGE);
  }, [typeFilter, threatFilter, minConf, familyFilter, iocs]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const items = useMemo(
    () =>
      cluster
        ? buildDisplayItems(visible, expanded)
        : visible.map((ioc) => ({ kind: "ioc", ioc })),
    [visible, expanded, cluster],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 37,
    overscan: 12,
  });

  // j and k move the selection, enter opens, esc closes
  useEffect(() => {
    function onKeyDown(e) {
      if (isTypingTarget(document.activeElement)) return;
      // let an open modal own the keyboard
      if (document.querySelector('[role="dialog"]')) return;
      if (!["j", "k", "Enter", "Escape"].includes(e.key)) return;

      const iocItems = items.filter((it) => it.kind === "ioc");
      if (e.key === "Escape") {
        onSelect?.(null);
        return;
      }
      if (iocItems.length === 0) return;

      const idx = iocItems.findIndex((it) => it.ioc.id === selectedId);
      if (e.key === "j") {
        e.preventDefault();
        onSelect?.(iocItems[Math.min(idx + 1, iocItems.length - 1)].ioc);
      } else if (e.key === "k") {
        e.preventDefault();
        onSelect?.(iocItems[Math.max(idx - 1, 0)].ioc);
      } else if (e.key === "Enter" && idx >= 0) {
        onSelect?.(iocItems[idx].ioc);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, selectedId, onSelect]);

  // keep the selected row in view when navigating by keyboard
  useEffect(() => {
    if (!selectedId) return;
    const index = items.findIndex(
      (it) => it.kind === "ioc" && it.ioc.id === selectedId,
    );
    if (index >= 0) virtualizer.scrollToIndex(index, { align: "auto" });
  }, [selectedId, items, virtualizer]);

  function toggleType(t) {
    if (!onTypeFilterChange) return;
    onTypeFilterChange(
      typeFilter.includes(t)
        ? typeFilter.filter((x) => x !== t)
        : [...typeFilter, t],
    );
  }

  function toggleCluster(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const confLabel =
    CONF_PRESETS.find((p) => p.value === minConf)?.label ?? "all";
  const matchedFamilies = familyOptions
    .filter((f) => f.toLowerCase().includes(familySearch.toLowerCase()))
    .slice(0, 8);

  return (
    <div id="ioc-feed" className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">{title}</h4>
        <span className="font-mono text-[10px] text-ink-3 tabular-nums">
          showing {Math.min(limit, filtered.length).toLocaleString()} of{" "}
          {filtered.length.toLocaleString()}
        </span>
        <span className="ml-auto hidden font-mono text-[9px] text-ink-3 lg:block">
          j / k move, enter open, esc close
        </span>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          title="Export the filtered list as CSV"
          className="flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface-2 px-2 py-1 font-mono text-[10px] text-ink-2 hover:border-accent hover:text-accent-soft"
        >
          <Download size={11} /> CSV
        </button>
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {onTypeFilterChange && (
          <FilterMenu
            label={
              typeFilter.length ? `type: ${typeFilter.join(", ")}` : "type: all"
            }
            active={typeFilter.length > 0}
          >
            {TYPES.map((t) => (
              <MenuItem
                key={t}
                checked={typeFilter.includes(t)}
                onClick={() => toggleType(t)}
              >
                {t}
              </MenuItem>
            ))}
            <MenuItem
              checked={typeFilter.length === 0}
              onClick={() => onTypeFilterChange([])}
            >
              all types
            </MenuItem>
          </FilterMenu>
        )}

        {onThreatFilterChange && (
          <FilterMenu
            label={
              threatFilter.length
                ? `threat: ${threatFilter
                    .map((t) => THREAT_LABELS[t] ?? t)
                    .join(", ")}`
                : "threat: all"
            }
            active={threatFilter.length > 0}
          >
            {threatOptions.map((t) => (
              <MenuItem
                key={t}
                checked={threatFilter.includes(t)}
                onClick={() =>
                  onThreatFilterChange(
                    threatFilter.includes(t)
                      ? threatFilter.filter((x) => x !== t)
                      : [...threatFilter, t],
                  )
                }
              >
                {THREAT_LABELS[t] ?? t}
              </MenuItem>
            ))}
            <MenuItem
              checked={threatFilter.length === 0}
              onClick={() => onThreatFilterChange([])}
            >
              all threats
            </MenuItem>
          </FilterMenu>
        )}

        <FilterMenu label={`confidence: ${confLabel}`} active={minConf > 0}>
          {CONF_PRESETS.map((p) => (
            <MenuItem
              key={p.value}
              checked={minConf === p.value}
              onClick={() => setMinConf(p.value)}
            >
              {p.label}
            </MenuItem>
          ))}
        </FilterMenu>

        {onFamilyFilterChange && (
          <FilterMenu
            label={familyFilter ? `family: ${familyFilter}` : "family: any"}
            active={Boolean(familyFilter)}
          >
            <span className="flex items-center gap-1.5 border-b border-line px-2.5 pb-1.5 pt-1">
              <Search size={11} className="text-ink-3" />
              <input
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
                placeholder="Search families"
                className="w-full bg-transparent font-mono text-[10.5px] text-ink placeholder:text-ink-3 focus:outline-none"
              />
            </span>
            {matchedFamilies.map((f) => (
              <MenuItem
                key={f}
                checked={familyFilter === f}
                onClick={() =>
                  onFamilyFilterChange(familyFilter === f ? null : f)
                }
              >
                <span className="truncate">{f}</span>
              </MenuItem>
            ))}
            {familyFilter && (
              <MenuItem
                checked={false}
                onClick={() => onFamilyFilterChange(null)}
              >
                clear family filter
              </MenuItem>
            )}
          </FilterMenu>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div
            role="table"
            aria-label={title}
            className="grid grid-cols-[70px_minmax(0,1fr)_130px_120px_42px_20px] gap-2.5 border-b border-line-2 px-2 pb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-3"
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
                  onTypeFilterChange?.([]);
                  onThreatFilterChange?.([]);
                  setMinConf(0);
                  onFamilyFilterChange?.(null);
                }}
              />
            </div>
          ) : (
            <>
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
                              burst of {item.iocs.length} IOCs, click to{" "}
                              {expanded.has(item.id) ? "collapse" : "expand"}
                            </span>
                          </button>
                        ) : (
                          <div className={item.inCluster ? "pl-5" : ""}>
                            <IOCCard
                              ioc={item.ioc}
                              selected={selectedId === item.ioc.id}
                              onSelect={() => onSelect?.(item.ioc)}
                              onFamilyClick={
                                onFamilyFilterChange
                                  ? () =>
                                      onFamilyFilterChange(
                                        item.ioc.malware_printable,
                                      )
                                  : undefined
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {filtered.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="mt-2 w-full rounded-lg border border-dashed border-line-2 py-2 font-mono text-[10.5px] text-ink-2 hover:border-accent/50 hover:text-ink"
                >
                  show {Math.min(PAGE, filtered.length - limit)} more,{" "}
                  {(filtered.length - limit).toLocaleString()} remaining
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
