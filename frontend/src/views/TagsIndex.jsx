import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { StatTile } from "../components/StatTile";
import { TagTreemap } from "../components/charts/TagTreemap";

// tags as a sortable table with the long tail collapsed
// each row shows how wide the tag spreads across families

const COLUMNS = [
  { key: "tag", label: "Tag", sortable: true },
  { key: "count", label: "IOCs", sortable: true, right: true },
  { key: "familyCount", label: "Families", sortable: true, right: true },
  { key: "topFamily", label: "Top family" },
];

const PAGE = 50;

export default function TagsIndex() {
  const recent = useRecentIOCs();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "count", dir: -1 });
  const [limit, setLimit] = useState(PAGE);

  const iocs = recent.data?.current;

  const rows = useMemo(() => {
    const byTag = {};
    for (const ioc of iocs ?? []) {
      for (const tag of ioc.tags ?? []) {
        const entry = (byTag[tag] ??= { tag, count: 0, families: {} });
        entry.count += 1;
        entry.families[ioc.malware_printable] =
          (entry.families[ioc.malware_printable] || 0) + 1;
      }
    }
    return Object.values(byTag).map((t) => {
      const famEntries = Object.entries(t.families).sort((a, b) => b[1] - a[1]);
      return {
        tag: t.tag,
        count: t.count,
        familyCount: famEntries.length,
        topFamily: famEntries[0]?.[0] ?? "",
      };
    });
  }, [iocs]);

  const shown = useMemo(() => {
    const filtered = search
      ? rows.filter((r) => r.tag.toLowerCase().includes(search.toLowerCase()))
      : rows;
    const key = sort.key;
    return [...filtered].sort((a, b) => {
      if (key === "tag" || key === "topFamily")
        return sort.dir * a[key].localeCompare(b[key]);
      return sort.dir * ((a[key] ?? 0) - (b[key] ?? 0));
    });
  }, [rows, search, sort]);

  const visible = shown.slice(0, limit);

  // band stats: tag noise and spread at a glance
  const band = useMemo(() => {
    const singles = rows.filter((r) => r.count === 1).length;
    const sorted = [...rows].sort((a, b) => b.count - a.count);
    const total = (iocs ?? []).length;
    let tagged = 0;
    for (const ioc of iocs ?? []) {
      if (ioc.tags?.length) tagged += 1;
    }
    return {
      singles,
      topTag: sorted[0]?.tag ?? "n/a",
      taggedPct: total ? Math.round((tagged / total) * 100) : 0,
    };
  }, [rows, iocs]);

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: -1 },
    );
  }

  return (
    <>
      <TopBar title="Tags" subtitle="Every tag seen in range" />
      <div className="reveal p-5">
        {recent.isPending ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No tags in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
          <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatTile label="Tags" value={rows.length} />
            <StatTile label="Top tag" value={band.topTag} />
            <StatTile label="Used once" value={band.singles}>
              <p className="mt-0.5 font-mono text-[9.5px] text-ink-3">
                One off or noise
              </p>
            </StatTile>
            <StatTile label="IOCs tagged" value={`${band.taggedPct}%`} />
          </div>
          <div className="mb-4">
            <TagTreemap rows={rows} />
          </div>
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h4 className="text-[14px] font-semibold">Campaign tags</h4>
              <span className="text-xs text-ink-3 tabular-nums">
                {shown.length} of {rows.length}
              </span>
              <span className="ml-auto flex min-w-[200px] items-center gap-2 rounded-lg border border-line bg-surface-0 px-2.5 py-1.5">
                <Search size={12} className="text-ink-3" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter tags"
                  className="w-full bg-transparent font-mono text-[11px] text-ink placeholder:text-ink-3 focus:outline-none"
                />
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1fr)] items-center gap-x-3 border-b border-line-2 px-2 pb-1.5">
                  {COLUMNS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      disabled={!c.sortable}
                      onClick={() => c.sortable && toggleSort(c.key)}
                      className={`flex items-center gap-1 text-[11px] font-medium text-ink-3 ${
                        c.right ? "justify-end" : ""
                      } ${c.sortable ? "hover:text-ink" : ""} ${
                        sort.key === c.key ? "text-accent-soft" : ""
                      }`}
                    >
                      {c.label}
                      {c.sortable && <ArrowUpDown size={9} />}
                    </button>
                  ))}
                </div>

                {visible.map((r) => (
                  <Link
                    key={r.tag}
                    to={`/tag/${encodeURIComponent(r.tag)}`}
                    className="grid grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1fr)] items-center gap-x-3 border-b border-line px-2 py-1.5 text-xs last:border-0 hover:bg-surface-2/50"
                  >
                    <span
                      className="truncate font-mono text-[10.5px] text-t-domain"
                      title={r.tag}
                    >
                      {r.tag}
                    </span>
                    <span className="text-right font-mono text-[10.5px] tabular-nums">
                      {r.count}
                    </span>
                    <span className="text-right font-mono text-[10.5px] text-ink-2 tabular-nums">
                      {r.familyCount}
                    </span>
                    <span
                      className="truncate text-[11px] text-accent-soft"
                      title={r.topFamily}
                    >
                      {r.topFamily}
                    </span>
                  </Link>
                ))}

                {shown.length > limit && (
                  <button
                    type="button"
                    onClick={() => setLimit((n) => n + PAGE)}
                    className="mt-2 w-full rounded-lg border border-dashed border-line-2 py-2 font-mono text-[10.5px] text-ink-2 hover:border-accent/50 hover:text-ink"
                  >
                    show {Math.min(PAGE, shown.length - limit)} more,{" "}
                    {shown.length - limit} remaining
                  </button>
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </>
  );
}
