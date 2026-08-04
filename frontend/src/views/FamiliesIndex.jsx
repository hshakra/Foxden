import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import {
  buildDailyChart,
  computeKpis,
  newFamilies,
  groupByFamily,
  familyTypeMix,
} from "../lib/processor";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, typeColor } from "../lib/colors";
import { parseThreatFoxDate, timeAgo } from "../lib/time";
import { useRange } from "../lib/range";
import { usePrefetchFamily } from "../hooks/useFamily";
import { Sparkline } from "../components/charts/Sparkline";
import { sparkRange } from "../lib/chartLabels";
import { TypeLegend } from "../components/charts/TypeLegend";
import { FamilyHeatmap } from "../components/charts/FamilyHeatmap";
import { StatTile } from "../components/ui/StatTile";
import { Group } from "../components/ui/Group";

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

const PAGE = 50;

export default function FamiliesIndex() {
  const recent = useRecentIOCs();
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "count", dir: -1 });
  const [limit, setLimit] = useState(PAGE);

  // reset paging when the visible set changes shape, adjusted during render
  const [prevShape, setPrevShape] = useState({ search, sort });
  if (prevShape.search !== search || prevShape.sort !== sort) {
    setPrevShape({ search, sort });
    setLimit(PAGE);
  }

  const iocs = recent.data?.current;
  const previous = recent.data?.previous;

  const rows = useMemo(() => {
    return Object.entries(groupByFamily(iocs ?? [])).map(([name, list]) => {
      let lastSeen = 0;
      for (const ioc of list) {
        const seen = parseThreatFoxDate(ioc.first_seen)?.getTime() ?? 0;
        if (seen > lastSeen) lastSeen = seen;
      }
      return {
        name,
        count: list.length,
        conf: computeKpis(list).avgConfidence,
        spark: buildDailyChart(list, Math.max(days, 7)),
        mix: familyTypeMix(list),
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
      topName: sorted[0]?.name ?? "",
      topCount: sorted[0]?.count ?? 0,
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
    // text columns read naturally ascending, numbers biggest first
    setSort((prev) =>
      prev.key === key
        ? { key, dir: -prev.dir }
        : { key, dir: key === "name" ? 1 : -1 },
    );
  }

  return (
    <>
      <TopBar title="Families" subtitle="Every family active in range" />
      <div className="reveal flex flex-col gap-8 p-6">
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
            <Group
              title="At a glance"
              description="How concentrated family activity is right now"
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                  label="Families"
                  value={rows.length.toLocaleString()}
                  comparison="active in range"
                />
                <StatTile
                  label="New in range"
                  value={band.fresh === null ? undefined : band.fresh}
                  comparison={
                    band.fresh === null
                      ? "needs a comparison window, pick 24h or 3d"
                      : "not seen in the previous window"
                  }
                />
                <StatTile
                  label="Top 5 share"
                  value={`${band.concentration}%`}
                  comparison="of all IOCs in range"
                />
                <StatTile
                  label="Busiest"
                  value={
                    <span className="block truncate font-sans">
                      {band.topName}
                    </span>
                  }
                  comparison={`${band.topCount.toLocaleString()} IOCs`}
                />
              </div>
            </Group>

            <FamilyHeatmap iocs={iocs ?? []} />

            <Group
              title="All families"
              description={`${shown.length} of ${rows.length} shown`}
              actions={
                <span className="flex min-w-[200px] items-center gap-2 rounded-md border border-line bg-lifted px-2.5 py-1.5">
                  <Search size={12} className="text-ink-low" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter families"
                    className="w-full bg-transparent text-secondary text-ink placeholder:text-ink-low focus:outline-none"
                  />
                </span>
              }
            >
              <div className="mb-1.5">
                <TypeLegend />
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[minmax(0,1fr)_64px_90px_96px_90px_80px] items-center gap-x-3 border-b border-line px-2 pb-2">
                    {COLUMNS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        disabled={!c.sortable}
                        onClick={() => c.sortable && toggleSort(c.key)}
                        className={`flex items-center gap-1 text-secondary font-medium whitespace-nowrap ${
                          c.right ? "justify-end" : ""
                        } ${
                          sort.key === c.key
                            ? "text-accent-soft"
                            : "text-ink-low"
                        } ${c.sortable ? "hover:text-ink" : ""}`}
                      >
                        {c.key === "trend" && shown[0]
                          ? sparkRange(shown[0].spark)
                          : c.label}
                        {c.sortable && <ArrowUpDown size={10} />}
                      </button>
                    ))}
                  </div>

                  {shown.slice(0, limit).map((r) => {
                    const conf = confidenceInfo(r.conf);
                    return (
                      <Link
                        key={r.name}
                        to={`/family/${encodeURIComponent(r.name)}`}
                        onMouseEnter={() => prefetchFamily(r.name)}
                        className="grid h-10 grid-cols-[minmax(0,1fr)_64px_90px_96px_90px_80px] items-center gap-x-3 border-b border-line px-2 text-body transition-colors duration-150 hover:bg-raised"
                      >
                        <span
                          className="truncate font-medium text-accent-soft"
                          title={r.name}
                        >
                          {r.name}
                        </span>
                        <span className="text-right font-mono text-secondary tabular-nums">
                          {r.count}
                        </span>
                        <span
                          className="font-mono text-secondary tabular-nums"
                          style={{
                            color:
                              conf.tone === "quiet"
                                ? "var(--color-ink-mid)"
                                : CONF_COLORS[conf.tone],
                          }}
                        >
                          {r.conf} {conf.label}
                        </span>
                        <span className="w-[88px]">
                          <Sparkline points={r.spark} width={88} height={22} />
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
                        <span className="text-right font-mono text-meta text-ink-low tabular-nums">
                          {r.lastSeen ? timeAgo(new Date(r.lastSeen)) : "–"}
                        </span>
                      </Link>
                    );
                  })}

                  {shown.length > limit && (
                    <button
                      type="button"
                      onClick={() => setLimit((n) => n + PAGE)}
                      className="mt-2 w-full rounded-md border border-dashed border-line-strong py-2 text-secondary text-ink-mid transition-colors duration-150 hover:border-accent/50 hover:text-ink"
                    >
                      Show {Math.min(PAGE, shown.length - limit)} more,{" "}
                      {shown.length - limit} remaining
                    </button>
                  )}
                </div>
              </div>
            </Group>
          </>
        )}
      </div>
    </>
  );
}
