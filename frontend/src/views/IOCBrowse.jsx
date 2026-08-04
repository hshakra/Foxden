import { useMemo, useState } from "react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { FacetRail } from "../components/FacetRail";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";

// the browse surface, facets on the left, the full feed in the middle,
// details on the right. the overview keeps only a preview of this
export default function IOCBrowse() {
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);
  const [familyFilter, setFamilyFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState([]);
  const [threatFilter, setThreatFilter] = useState([]);

  const current = recent.data?.current;
  const iocs = useMemo(() => current ?? [], [current]);

  return (
    <>
      <TopBar title="IOCs" subtitle="Browse all indicators in range" />
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
            className={`grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)] ${
              selected
                ? "xl:grid-cols-[210px_minmax(0,1fr)_300px]"
                : "xl:grid-cols-[210px_minmax(0,1fr)]"
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
            />
            {selected && (
              <IOCDrawer
                ioc={selected}
                onClose={() => setSelected(null)}
                onFilterFamily={(family) => setFamilyFilter(family)}
                pool={iocs}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
