import { useMemo } from "react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { FamilyCard } from "./FamilyCard";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export default function FamiliesIndex() {
  const recent = useRecentIOCs();

  const ranked = useMemo(() => {
    if (!recent.data) return [];
    const counts = {};
    for (const ioc of recent.data) {
      counts[ioc.malware_printable] = (counts[ioc.malware_printable] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [recent.data]);

  const max = ranked[0]?.count ?? 1;

  return (
    <>
      <TopBar title="Families" subtitle="every family active in range" />
      <div className="reveal p-5">
        {recent.isPending ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : ranked.length === 0 ? (
          <EmptyState
            title="No families in this range"
            hint="Try widening the time range."
          />
        ) : (
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="mb-2 flex items-baseline gap-2.5">
              <h4 className="text-[13px] font-semibold">
                Active malware families
              </h4>
              <span className="font-mono text-[10px] text-ink-3">
                {ranked.length} in range, click one to open its profile
              </span>
            </div>
            <div className="columns-1 gap-8 md:columns-2 xl:columns-3">
              {ranked.map((f, rank) => (
                <div key={f.name} className="break-inside-avoid">
                  <FamilyCard
                    rank={rank + 1}
                    name={f.name}
                    count={f.count}
                    max={max}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
