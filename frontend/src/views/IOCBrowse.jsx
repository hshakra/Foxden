import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { FacetRail } from "../components/FacetRail";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";

// the browse surface, facets on the left, the full feed in the middle,
// details on the right. the overview keeps only a preview of this
// filters live in the url so a filtered view can be shared or refreshed
export default function IOCBrowse() {
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);
  const [params, setParams] = useSearchParams();

  const typeFilter = useMemo(() => params.getAll("type"), [params]);
  const threatFilter = useMemo(() => params.getAll("threat"), [params]);
  const familyFilter = params.get("family");

  function updateParams(mutate) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        mutate(next);
        return next;
      },
      { replace: true },
    );
  }

  const setTypeFilter = (list) =>
    updateParams((p) => {
      p.delete("type");
      for (const t of list) p.append("type", t);
    });
  const setThreatFilter = (list) =>
    updateParams((p) => {
      p.delete("threat");
      for (const t of list) p.append("threat", t);
    });
  const setFamilyFilter = (name) =>
    updateParams((p) => {
      if (name) p.set("family", name);
      else p.delete("family");
    });

  const current = recent.data?.current;
  const iocs = useMemo(() => current ?? [], [current]);

  return (
    <>
      <TopBar
        title="IOCs"
        subtitle="Browse all indicators of compromise in range"
      />
      <div className="reveal p-6">
        {recent.isPending ? (
          <SkeletonRows rows={12} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
          />
        ) : (
          <div
            className={`grid items-start gap-4 ${
              selected
                ? "lg:grid-cols-[210px_minmax(0,1fr)_280px] xl:grid-cols-[210px_minmax(0,1fr)_300px]"
                : "lg:grid-cols-[210px_minmax(0,1fr)]"
            }`}
          >
            <FacetRail
              iocs={iocs}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              threatFilter={threatFilter}
              onThreatFilterChange={setThreatFilter}
              familyFilter={familyFilter}
              onFamilyFilterChange={setFamilyFilter}
            />
            <FeedTable
              iocs={iocs}
              selectedId={selected?.id}
              onSelect={setSelected}
              familyFilter={familyFilter}
              onFamilyFilterChange={setFamilyFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              threatFilter={threatFilter}
              onThreatFilterChange={setThreatFilter}
              title="All IOCs"
              maxH="max-h-[72vh]"
            />
            {selected && (
              <IOCDrawer
                ioc={selected}
                onClose={() => setSelected(null)}
                onFamilyFilterChange={(family) => setFamilyFilter(family)}
                pool={iocs}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
