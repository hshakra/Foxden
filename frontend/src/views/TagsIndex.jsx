import { useMemo } from "react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { TagChip } from "./TagChip";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export default function TagsIndex() {
  const recent = useRecentIOCs();

  const ranked = useMemo(() => {
    if (!recent.data) return [];
    const counts = {};
    for (const ioc of recent.data) {
      for (const tag of ioc.tags ?? []) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [recent.data]);

  return (
    <>
      <TopBar title="Tags" subtitle="every tag seen in range" />
      <div className="p-5">
        {recent.isPending ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : ranked.length === 0 ? (
          <EmptyState
            title="No tags in this range"
            hint="Try widening the time range."
          />
        ) : (
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="mb-3 flex items-baseline gap-2.5">
              <h4 className="text-[13px] font-semibold">Campaign tags</h4>
              <span className="font-mono text-[10px] text-ink-3">
                {ranked.length} in range · click → explore
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ranked.map((t) => (
                <TagChip key={t.tag} tag={t.tag} count={t.count} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
