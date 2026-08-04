import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import useFrozenFeed from "../hooks/useFrozenFeed";
import useLastVisit from "../hooks/useLastVisit";
import { Watchlist } from "../components/Watchlist";
import { useRange } from "../lib/range";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { SignalStrip } from "../components/SignalStrip";
import { OriginMap } from "../components/OriginMap";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopFamilies } from "./TopFamilies.jsx";
import { TopTags } from "./TopTags.jsx";
import { TopPorts } from "./TopPorts.jsx";

// the overview screen
// signal strip, then the map, then the feed with its detail drawer
// background refetches wait behind the refresh pill instead of
// shifting the page, and the newest ioc starts selected on desktop
export default function LiveFeed() {
  const recent = useRecentIOCs();
  const { days } = useRange();
  const frozen = useFrozenFeed(recent.data, days);
  const [selected, setSelected] = useState(null);
  const [familyFilter, setFamilyFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState([]);
  const [threatFilter, setThreatFilter] = useState([]);
  const dismissed = useRef(false);

  const current = frozen.data?.current;
  const iocs = useMemo(() => current ?? [], [current]);
  const previous = frozen.data?.previous ?? [];
  const sinceLastVisit = useLastVisit(iocs);

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
        {recent.isPending && !frozen.data ? (
          <SkeletonRows rows={10} />
        ) : recent.isError && !frozen.data ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
            {frozen.pendingCount > 0 && (
              <button
                type="button"
                onClick={frozen.refresh}
                className="fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/50 bg-surface-3 px-4 py-2 font-mono text-[11px] text-accent-soft shadow-xl transition-colors hover:bg-surface-2"
              >
                <RefreshCw size={12} />
                {frozen.pendingCount} new IOCs arrived, refresh
              </button>
            )}

            <Watchlist iocs={iocs} />
            {sinceLastVisit > 0 && (
              <p className="-my-3 font-mono text-[10px] text-ink-3 tabular-nums">
                {sinceLastVisit.toLocaleString()} new IOCs since your last
                visit
              </p>
            )}
            <SignalStrip
              iocs={iocs}
              previous={previous}
              onTypeClick={(type) => {
                setTypeFilter([type]);
                document
                  .getElementById("ioc-feed")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              onThreatClick={(threat) => {
                setThreatFilter([threat]);
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
                threatFilter={threatFilter}
                onThreatFilterChange={setThreatFilter}
              />
              {selected && (
                <IOCDrawer
                  ioc={selected}
                  onClose={() => handleSelect(null)}
                  onFilterFamily={(family) => setFamilyFilter(family)}
                />
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_0.8fr]">
              <TopFamilies iocs={iocs} />
              <TopTags iocs={iocs} />
              <TopPorts iocs={iocs} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
