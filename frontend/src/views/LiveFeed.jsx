import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import useRecentIOCs from "../hooks/useRecentIOCs";
import useFrozenFeed from "../hooks/useFrozenFeed";
import useLastVisit from "../hooks/useLastVisit";
import { Watchlist } from "../components/Watchlist";
import { useRange } from "../lib/range";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { Situation } from "../components/Situation";
import { CompositionBars } from "../components/CompositionBars";
import { Movers } from "../components/Movers";
import { OriginMap } from "../components/OriginMap";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { Group } from "../components/ui/Group";
import { TopFamilies } from "../components/TopFamilies";
import { TopTags } from "../components/TopTags";
import { TopPorts } from "../components/TopPorts";

function scrollToFeed() {
  document.getElementById("ioc-feed")?.scrollIntoView({ behavior: "smooth" });
}

// the overview, titled groups in macro to micro order
// situation, composition, origins, movers, watchlist, latest, leaders
// background refetches wait behind the refresh pill instead of
// shifting the page, and the newest ioc starts selected on desktop
export default function LiveFeed() {
  const recent = useRecentIOCs();
  const { days } = useRange();
  const frozen = useFrozenFeed(recent.data, `${days}:${recent.isPlaceholderData}`);
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
      <TopBar
        title="Overview"
        subtitle="Global threat activity in range"
        descriptionExtra={
          sinceLastVisit > 0 && (
            <button
              type="button"
              onClick={scrollToFeed}
              className="font-medium text-accent tabular-nums hover:underline"
            >
              {sinceLastVisit.toLocaleString()} new since your last visit
            </button>
          )
        }
      />
      {/* keyed so the fade replays when the real content replaces the skeleton */}
      <div
        key={recent.isPending && !frozen.data ? "loading" : "ready"}
        className="reveal flex flex-col gap-8 p-6"
      >
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
                className="reveal fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/50 bg-overlay px-4 py-2 font-mono text-meta text-accent-soft shadow-xl transition-colors duration-150 hover:bg-lifted"
              >
                <RefreshCw size={12} />
                {frozen.pendingCount} new IOCs arrived, refresh
              </button>
            )}

            <Group
              title="Situation"
              description="The current window at a glance"
            >
              <Situation iocs={iocs} previous={previous} />
            </Group>

            <Group
              title="Composition"
              description="What the indicators are and what they are used for, click to filter the feed"
            >
              <CompositionBars
                iocs={iocs}
                onTypeClick={(type) => {
                  setTypeFilter([type]);
                  scrollToFeed();
                }}
                onThreatClick={(threat) => {
                  setThreatFilter([threat]);
                  scrollToFeed();
                }}
              />
            </Group>

            <OriginMap iocs={iocs} previous={previous} />

            <Group
              title="Movers"
              description="Change against each family's own history"
            >
              <Movers iocs={iocs} previous={previous} />
            </Group>

            <Watchlist iocs={iocs} />

            <div
              className={`grid items-start gap-4 ${
                selected ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""
              }`}
            >
              <div className="min-w-0">
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
                  title="Latest IOCs"
                  preview={15}
                />
                <Link
                  to="/iocs"
                  className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-secondary text-ink-mid transition-colors duration-150 hover:border-accent/50 hover:text-ink"
                >
                  Browse all {iocs.length.toLocaleString()} IOCs with facets
                  <ArrowRight size={12} />
                </Link>
              </div>
              {selected && (
                <IOCDrawer
                  ioc={selected}
                  onClose={() => handleSelect(null)}
                  onFamilyFilterChange={(family) => setFamilyFilter(family)}
                  pool={iocs}
                />
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_0.8fr]">
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
