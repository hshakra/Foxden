import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { StatTile } from "../components/ui/StatTile";
import { Group } from "../components/ui/Group";
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

  // reset paging when the visible set changes shape, adjusted during render
  const [prevShape, setPrevShape] = useState({ search, sort });
  if (prevShape.search !== search || prevShape.sort !== sort) {
    setPrevShape({ search, sort });
    setLimit(PAGE);
  }

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
      topTag: sorted[0]?.tag ?? "",
      topCount: sorted[0]?.count ?? 0,
      taggedPct: total ? Math.round((tagged / total) * 100) : 0,
    };
  }, [rows, iocs]);

  function toggleSort(key) {
    // text columns read naturally ascending, numbers biggest first
    setSort((prev) =>
      prev.key === key
        ? { key, dir: -prev.dir }
        : { key, dir: key === "tag" || key === "topFamily" ? 1 : -1 },
    );
  }

  return (
    <>
      <TopBar title="Tags" subtitle="Every tag seen in range" />
      <div className="reveal flex flex-col gap-8 p-6">
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
            <Group
              title="At a glance"
              description="How well labeled the window is"
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                  label="Tags"
                  value={rows.length.toLocaleString()}
                  comparison="seen in range"
                />
                <StatTile
                  label="Top tag"
                  value={
                    <span className="block truncate">{band.topTag}</span>
                  }
                  comparison={`${band.topCount.toLocaleString()} IOCs`}
                />
                <StatTile
                  label="Used once"
                  value={band.singles.toLocaleString()}
                  comparison="one off or noise"
                />
                <StatTile
                  label="IOCs tagged"
                  value={`${band.taggedPct}%`}
                  comparison="of all IOCs in range"
                />
              </div>
            </Group>

            <TagTreemap rows={rows} />

            <Group
              title="All tags"
              description={`${shown.length} of ${rows.length} shown`}
              actions={
                <span className="flex min-w-[200px] items-center gap-2 rounded-md border border-line bg-lifted px-2.5 py-1.5 transition-colors duration-150 focus-within:border-accent">
                  <Search size={12} className="text-ink-low" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter tags"
                    className="w-full bg-transparent text-secondary text-ink placeholder:text-ink-low focus:outline-none"
                  />
                </span>
              }
            >
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1fr)] items-center gap-x-3 border-b border-line px-2 pb-2">
                    {COLUMNS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        disabled={!c.sortable}
                        onClick={() => c.sortable && toggleSort(c.key)}
                        className={`flex items-center gap-1 text-secondary font-medium ${
                          c.right ? "justify-end" : ""
                        } ${
                          sort.key === c.key
                            ? "text-accent-soft"
                            : "text-ink-low"
                        } ${c.sortable ? "hover:text-ink" : ""}`}
                      >
                        {c.label}
                        {c.sortable && <ArrowUpDown size={10} />}
                      </button>
                    ))}
                  </div>

                  {visible.map((r) => (
                    <Link
                      key={r.tag}
                      to={`/tag/${encodeURIComponent(r.tag)}`}
                      className="grid h-10 grid-cols-[minmax(0,1fr)_64px_72px_minmax(0,1fr)] items-center gap-x-3 border-b border-line px-2 text-body transition-colors duration-150 hover:bg-raised"
                    >
                      <span
                        className="truncate font-mono text-secondary text-accent-soft"
                        title={r.tag}
                      >
                        {r.tag}
                      </span>
                      <span className="text-right font-mono text-secondary tabular-nums">
                        {r.count}
                      </span>
                      <span className="text-right font-mono text-secondary text-ink-mid tabular-nums">
                        {r.familyCount}
                      </span>
                      <span
                        className="truncate text-secondary text-ink-mid"
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
