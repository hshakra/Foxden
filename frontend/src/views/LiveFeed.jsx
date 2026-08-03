import { useState } from "react";
import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { SignalStrip } from "../components/SignalStrip";
import { OriginMap } from "../components/OriginMap";
import { FeedTable } from "../components/FeedTable";
import { TopFamilies } from "./TopFamilies.jsx";
import { TopTags } from "./TopTags.jsx";

/*
  The Overview screen, per Shneiderman: overview strip → map hero →
  filterable feed. Detail drawer arrives in Phase 3.
*/
export default function LiveFeed() {
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);

  return (
    <>
      <TopBar title="Overview" subtitle="global threat activity" />
      <div className="flex flex-col gap-6 p-5">
        {recent.isPending ? (
          <SkeletonRows rows={10} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : recent.data.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
            <SignalStrip iocs={recent.data} />
            <OriginMap iocs={recent.data} />
            <FeedTable
              iocs={recent.data}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <TopFamilies iocs={recent.data} />
              <TopTags iocs={recent.data} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
