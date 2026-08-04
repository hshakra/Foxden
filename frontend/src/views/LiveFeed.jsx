import { useEffect, useMemo, useRef, useState } from "react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { SignalStrip } from "../components/SignalStrip";
import { OriginMap } from "../components/OriginMap";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopFamilies } from "./TopFamilies.jsx";
import { TopTags } from "./TopTags.jsx";

// the overview screen
// signal strip, then the map, then the feed with its detail drawer
// the newest ioc starts selected on desktop so the drawer is discoverable
export default function LiveFeed() {
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);
  const [familyFilter, setFamilyFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState([]);
  const dismissed = useRef(false);

  const current = recent.data?.current;
  const iocs = useMemo(() => current ?? [], [current]);
  const previous = recent.data?.previous ?? [];

  useEffect(() => {
    if (
      !selected &&
      !dismissed.current &&
      iocs.length > 0 &&
      window.innerWidth >= 1024
    ) {
      const newest = [...iocs].sort((a, b) =>
        b.first_seen.localeCompare(a.first_seen),
      )[0];
      setSelected(newest);
    }
  }, [iocs, selected]);

  function handleSelect(ioc) {
    if (ioc === null) dismissed.current = true;
    setSelected(ioc);
  }

  return (
    <>
      <TopBar title="Overview" subtitle="global threat activity" />
      <div className="reveal flex flex-col gap-6 p-5">
        {recent.isPending ? (
          <SkeletonRows rows={10} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
            <SignalStrip
              iocs={iocs}
              previous={previous}
              onTypeClick={(type) => {
                setTypeFilter([type]);
                document
                  .getElementById("ioc-feed")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <OriginMap iocs={iocs} />
            <div
              className={`grid items-start gap-4 ${
                selected ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""
              }`}
            >
              <FeedTable
                iocs={iocs}
                selectedId={selected?.id}
                onSelect={handleSelect}
                familyFilter={familyFilter}
                onFamilyFilterChange={setFamilyFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
              />
              {selected && (
                <IOCDrawer
                  ioc={selected}
                  onClose={() => handleSelect(null)}
                  onFilterFamily={(family) => setFamilyFilter(family)}
                />
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <TopFamilies iocs={iocs} />
              <TopTags iocs={iocs} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
