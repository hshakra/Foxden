import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { buildDailyChart, computeKpis } from "../utils/processor";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, typeColor } from "../lib/colors";
import { parseThreatFoxDate, timeAgo } from "../lib/time";
import { useRange } from "../lib/range";
import { usePrefetchFamily } from "../hooks/useFamily";
import { Sparkline } from "../components/charts/Sparkline";
import { sparkRange } from "../lib/chartLabels";
import { TypeLegend } from "../components/charts/TypeLegend";
import { FamilyHeatmap } from "../components/charts/FamilyHeatmap";
import { StatTile } from "../components/StatTile";
import { newFamilies } from "../utils/processor";

// families as a sortable table
// count, confidence, trend, and type mix per family so the page answers
// questions instead of just listing names

const COLUMNS = [
  { key: "name", label: "Family", sortable: true },
  { key: "count", label: "IOCs", sortable: true, right: true },
  { key: "conf", label: "Avg conf", sortable: true },
  { key: "trend", label: "Trend" }, // label swaps to the date window below
  { key: "mix", label: "Type mix" },
  { key: "lastSeen", label: "Last seen", sortable: true, right: true },
];

export default function FamiliesIndex() {
  const recent = useRecentIOCs();
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "count", dir: -1 });

  const iocs = recent.data?.current;
  const previous = recent.data?.previous;

  const rows = useMemo(() => {
    const byFamily = {};
    for (const ioc of iocs ?? []) {
      (byFamily[ioc.malware_printable] ??= []).push(ioc);
    }
    return Object.entries(byFamily).map(([name, list]) => {
      const typeCounts = {};
      let lastSeen = 0;
      for (const ioc of list) {
        const t = ioc.ioc_type.endsWith("_hash") ? "hash" : ioc.ioc_type;
        typeCounts[t] = (typeCounts[t] || 0) + 1;
        const seen = parseThreatFoxDate(ioc.first_seen)?.getTime() ?? 0;
        if (seen > lastSeen) lastSeen = seen;
      }
      return {
        name,
        count: list.length,
        conf: computeKpis(list).avgConfidence,
        spark: buildDailyChart(list, Math.max(days, 7)),
        mix: Object.entries(typeCounts).map(([type, count]) => ({
          type,
          pct: Math.round((count / list.length) * 100),
        })),
        lastSeen,
      };
    });
  }, [iocs, days]);

  // band stats: how concentrated the activity is and what just appeared
  const band = useMemo(() => {
    const total = (iocs ?? []).length;
    const sorted = [...rows].sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5).reduce((sum, r) => sum + r.count, 0);
    return {
      fresh: previous?.length ? newFamilies(iocs ?? [], previous) : null,
      topName: sorted[0]?.name ?? "n/a",
      concentration: total ? Math.round((top5 / total) * 100) : 0,
    };
  }, [rows, iocs, previous]);

  const shown = useMemo(() => {
    const filtered = search
      ? rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      : rows;
    const key = sort.key;
    return [...filtered].sort((a, b) => {
      if (key === "name") return sort.dir * a.name.localeCompare(b.name);
      return sort.dir * ((a[key] ?? 0) - (b[key] ?? 0));
    });
  }, [rows, search, sort]);

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: -1 },
    );
  }

  return (
    <>
      <TopBar title="Families" subtitle="every family active in range" />
      <div className="reveal p-5">
        {recent.isPending ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No families in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatTile label="Families" value={rows.length} />
            <StatTile
              label="New in range"
              value={band.fresh === null ? "n/a" : band.fresh}
            >
              {band.fresh === null && (
                <p className="mt-0.5 font-mono text-[9.5px] text-ink-3">
                  needs a comparison window, try 24h or 3d
                </p>
              )}
            </StatTile>
            <StatTile label="Top 5 share" value={`${band.concentration}%`}>
              <p className="mt-0.5 font-mono text-[9.5px] text-ink-3">
                of all IOCs in range
              </p>
            </StatTile>
            <StatTile label="Busiest" value={band.topName} />
          </div>
          <div className="mb-4">
            <FamilyHeatmap iocs={iocs ?? []} />
          </div>
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h4 className="text-[13px] font-semibold">
                Active malware families
              </h4>
              <span className="font-mono text-[10px] text-ink-3 tabular-nums">
                {shown.length} of {rows.length}
              </span>
              <TypeLegend />
              <span className="ml-auto flex min-w-[200px] items-center gap-2 rounded-lg border border-line bg-surface-0 px-2.5 py-1.5">
                <Search size={12} className="text-ink-3" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter families"
                  className="w-full bg-transparent font-mono text-[11px] text-ink placeholder:text-ink-3 focus:outline-none"
                />
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[minmax(0,1fr)_64px_90px_88px_90px_80px] items-center gap-x-3 border-b border-line-2 px-2 pb-1.5">
                  {COLUMNS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      disabled={!c.sortable}
                      onClick={() => c.sortable && toggleSort(c.key)}
                      className={`flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-ink-3 ${
                        c.right ? "justify-end" : ""
                      } ${c.sortable ? "hover:text-ink" : ""} ${
                        sort.key === c.key ? "text-accent-soft" : ""
                      }`}
                    >
                      {c.key === "trend" && shown[0]
                        ? sparkRange(shown[0].spark)
                        : c.label}
                      {c.sortable && <ArrowUpDown size={9} />}
                    </button>
                  ))}
                </div>

                {shown.map((r) => {
                  const conf = confidenceInfo(r.conf);
                  return (
                    <Link
                      key={r.name}
                      to={`/family/${encodeURIComponent(r.name)}`}
                      onMouseEnter={() => prefetchFamily(r.name)}
                      className="grid grid-cols-[minmax(0,1fr)_64px_90px_88px_90px_80px] items-center gap-x-3 border-b border-line px-2 py-1.5 text-xs last:border-0 hover:bg-surface-2/50"
                    >
                      <span
                        className="truncate font-semibold text-accent-soft"
                        title={r.name}
                      >
                        {r.name}
                      </span>
                      <span className="text-right font-mono text-[10.5px] tabular-nums">
                        {r.count}
                      </span>
                      <span
                        className="font-mono text-[10px] tabular-nums"
                        style={{
                          color:
                            conf.tone === "quiet"
                              ? "var(--color-ink-2)"
                              : CONF_COLORS[conf.tone],
                        }}
                      >
                        {r.conf} {conf.label}
                      </span>
                      <span className="w-[72px]">
                        <Sparkline points={r.spark} width={72} height={22} />
                      </span>
                      <span className="flex h-[5px] w-[76px] gap-[2px]">
                        {r.mix.map((p) => (
                          <span
                            key={p.type}
                            title={`${p.type} ${p.pct}%`}
                            className="rounded-[1px]"
                            style={{
                              width: `${p.pct}%`,
                              background: typeColor(p.type),
                            }}
                          />
                        ))}
                      </span>
                      <span className="text-right font-mono text-[10px] text-ink-3 tabular-nums">
                        {timeAgo(new Date(r.lastSeen))}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
