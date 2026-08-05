import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, ChevronDown, Download, Search } from "lucide-react";
import { sortRecentStream, normalizeType, splitIpPort } from "../lib/processor";
import { THREAT_LABELS } from "../lib/colors";
import { IOCCard } from "./IOCCard";
import { EmptyState } from "./states";
import { Group } from "./ui/Group";
import { Menu, MenuItem } from "./ui/Menu";

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
// stable defaults so the paging reset effect only fires on real changes
const NO_FILTER = [];
const NO_GEO = {};

function buildDisplayItems(stream, expanded) {
  const items = [];
  let run = [];

  function flushRun() {
    if (run.length >= CLUSTER_MIN) {
      // keyed to the oldest ioc so a refresh prepending rows keeps the
      // expansion state instead of silently collapsing it
      const id = `${run[0].malware_printable}-${run[run.length - 1].id}`;
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

// feed values are attacker supplied, neuter leading formula characters
// so the export cannot execute anything when opened in a spreadsheet
function csvCell(value) {
  const safe = String(value ?? "").replace(/^([=+\-@\t\r])/, "'$1");
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportCsv(rows) {
  const head = "ioc,type,family,confidence,first_seen,tags";
  const lines = rows.map((r) =>
    [
      csvCell(r.ioc),
      r.ioc_type,
      csvCell(r.malware_printable),
      r.confidence_level,
      r.first_seen,
      csvCell((r.tags ?? []).join(" ")),
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
  typeFilter = NO_FILTER,
  onTypeFilterChange,
  threatFilter = NO_FILTER,
  onThreatFilterChange,
  countryFilter = NO_FILTER,
  onCountryFilterChange,
  portFilter = NO_FILTER,
  onPortFilterChange,
  geoByIp = NO_GEO,
  title = "Live IOC feed",
  cluster = true,
  preview = 0,
  showFamily = true,
  // open the newest row on arrival so the detail panel is never empty
  autoSelect = false,
  // the overview embeds a short feed, the browse page gets a tall one
  maxH = "max-h-[520px]",
}) {
  const [minConf, setMinConf] = useState(0);
  const [familySearch, setFamilySearch] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [limit, setLimit] = useState(PAGE);
  const scrollRef = useRef(null);
  const dismissed = useRef(false);
  const prevSelectedId = useRef(selectedId);

  const stream = useMemo(() => sortRecentStream(iocs), [iocs]);

  const filtered = useMemo(() => {
    return stream.filter((ioc) => {
      if (typeFilter.length && !typeFilter.includes(normalizeType(ioc.ioc_type)))
        return false;
      if (threatFilter.length && !threatFilter.includes(ioc.threat_type))
        return false;
      if ((Number(ioc.confidence_level) || 0) < minConf) return false;
      if (familyFilter && ioc.malware_printable !== familyFilter) return false;
      if (countryFilter.length || portFilter.length) {
        if (ioc.ioc_type !== "ip:port") return false;
        const [ip, port] = splitIpPort(ioc.ioc);
        if (
          countryFilter.length &&
          !countryFilter.includes(geoByIp[ip]?.countryCode)
        )
          return false;
        if (portFilter.length && !portFilter.includes(port)) return false;
      }
      return true;
    });
  }, [stream, typeFilter, threatFilter, minConf, familyFilter, countryFilter, portFilter, geoByIp]);

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

  // reset paging when the filters change shape, not on the background
  // refresh, that would yank a deep reader back to the first page
  useEffect(() => {
    setLimit(PAGE);
  }, [typeFilter, threatFilter, minConf, familyFilter, countryFilter, portFilter]);

  // start on the newest row that survives the filters, so the page arrives
  // showing a real indicator instead of an empty half of the layout.
  // closing the panel is a decision, once dismissed it stays closed and
  // there is no room for the panel on narrow screens
  useEffect(() => {
    if (prevSelectedId.current && !selectedId) dismissed.current = true;
    prevSelectedId.current = selectedId;
    if (!autoSelect || selectedId || dismissed.current) return;
    if (window.innerWidth < 1024) return;
    if (filtered[0]) onSelect?.(filtered[0]);
  }, [autoSelect, selectedId, filtered, onSelect]);

  const cap = preview || limit;
  const visible = useMemo(() => filtered.slice(0, cap), [filtered, cap]);
  // clustering makes no sense once the feed is filtered to one family
  const clusterOn = cluster && !familyFilter;
  const items = useMemo(
    () =>
      clusterOn
        ? buildDisplayItems(visible, expanded)
        : visible.map((ioc) => ({ kind: "ioc", ioc })),
    [visible, expanded, clusterOn],
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  // j and k move the selection, enter opens, esc closes
  useEffect(() => {
    function onKeyDown(e) {
      if (isTypingTarget(document.activeElement)) return;
      // let an open modal or dropdown own the keyboard
      if (document.querySelector('[role="dialog"]')) return;
      if (document.querySelector('[aria-expanded="true"]')) return;
      if (!["j", "k", "Enter", "Escape"].includes(e.key)) return;

      const iocItems = items.filter((it) => it.kind === "ioc");
      if (e.key === "Escape") {
        onSelect?.(null);
        return;
      }
      if (iocItems.length === 0) return;

      let idx = iocItems.findIndex((it) => it.ioc.id === selectedId);
      if (idx < 0 && selectedId) {
        // the selection sits inside a collapsed cluster, step relative to
        // the nearest visible row instead of jumping to the top
        const streamAt = visible.findIndex((ioc) => ioc.id === selectedId);
        if (streamAt >= 0) {
          const before = new Set(visible.slice(0, streamAt).map((i) => i.id));
          let nearest = -1;
          for (let i = 0; i < iocItems.length; i++) {
            if (before.has(iocItems[i].ioc.id)) nearest = i;
          }
          idx = nearest;
        }
      }
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
  }, [items, visible, selectedId, onSelect]);

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
    <Group
      id="ioc-feed"
      title={title}
      description={`Showing ${Math.min(cap, filtered.length).toLocaleString()} of ${filtered.length.toLocaleString()}`}
      actions={
        <>
          <span className="hidden text-meta text-ink-low lg:inline">
            j and k move, enter opens, esc closes
          </span>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            title={`Export the ${filtered.length.toLocaleString()} filtered rows as CSV`}
            className="flex items-center gap-1.5 rounded-md border border-line bg-lifted px-2 py-1 text-secondary text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <Download size={12} /> CSV
          </button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {onTypeFilterChange && (
          <Menu
            label={
              typeFilter.length ? `Type: ${typeFilter.join(", ")}` : "Type: all"
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
          </Menu>
        )}

        {onThreatFilterChange && (
          <Menu
            label={
              threatFilter.length
                ? `Threat: ${threatFilter
                    .map((t) => THREAT_LABELS[t] ?? t)
                    .join(", ")}`
                : "Threat: all"
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
          </Menu>
        )}

        <Menu label={`Confidence: ${confLabel}`} active={minConf > 0}>
          {CONF_PRESETS.map((p) => (
            <MenuItem
              key={p.value}
              checked={minConf === p.value}
              onClick={() => setMinConf(p.value)}
            >
              {p.label}
            </MenuItem>
          ))}
        </Menu>

        {onFamilyFilterChange && (
          <Menu
            label={familyFilter ? `Family: ${familyFilter}` : "Family: all"}
            active={Boolean(familyFilter)}
          >
            <span className="flex items-center gap-1.5 border-b border-line px-2.5 pb-1.5 pt-1 transition-colors duration-150 focus-within:border-accent">
              <Search size={11} className="text-ink-low" />
              <input
                value={familySearch}
                onChange={(e) => setFamilySearch(e.target.value)}
                placeholder="Search families"
                className="w-full bg-transparent text-secondary text-ink placeholder:text-ink-low focus:outline-none"
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
          </Menu>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div
            role="table"
            aria-label={title}
            className={`grid gap-2.5 border-b border-line px-2 pb-2 text-secondary font-medium text-ink-low ${
              showFamily
                ? "grid-cols-[72px_minmax(0,1fr)_130px_120px_42px_20px]"
                : "grid-cols-[72px_minmax(0,1fr)_120px_42px_20px]"
            }`}
          >
            <span>Type</span>
            <span>Indicator</span>
            {showFamily && <span>Family</span>}
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
                  onCountryFilterChange?.([]);
                  onPortFilterChange?.([]);
                  setMinConf(0);
                  onFamilyFilterChange?.(null);
                }}
              />
            </div>
          ) : (
            <>
              <div ref={scrollRef} className={`${maxH} overflow-y-auto`}>
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
                            className="my-1 flex w-full items-center gap-2 rounded-md border border-dashed border-line-strong px-2.5 py-1.5 text-left text-secondary text-ink-mid transition-colors duration-150 hover:border-accent/50 hover:text-ink"
                          >
                            {expanded.has(item.id) ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                            <b className="font-medium text-ink">{item.family}</b>
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
                              showFamily={showFamily}
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
              {!preview && filtered.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="mt-2 w-full rounded-md border border-dashed border-line-strong py-2 text-secondary text-ink-mid transition-colors duration-150 hover:border-accent/50 hover:text-ink"
                >
                  Show {Math.min(PAGE, filtered.length - limit)} more,{" "}
                  {(filtered.length - limit).toLocaleString()} remaining
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Group>
  );
}
