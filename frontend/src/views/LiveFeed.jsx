import useRecentIOCs from "../hooks/useRecentIOCS.js";
import { TopBar } from "../components/TopBar";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";
import { ActivityChart } from "./ActivityChart.jsx";
import { TopFamilies } from "./TopFamilies.jsx";
import { TopTags } from "./TopTags.jsx";
import { TypeBreakdown } from "./TypeBreakdown.jsx";

export default function LiveFeed() {
  const recent = useRecentIOCs();

  return (
    <>
      <TopBar title="Overview" subtitle="global threat activity" />
      <div className="flex flex-col gap-6 p-5">
        {recent.isPending ? (
          <SkeletonRows rows={8} />
        ) : recent.isError ? (
          <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
        ) : recent.data.length === 0 ? (
          <EmptyState
            title="No IOCs in this range"
            hint="Try widening the time range."
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <ActivityChart iocs={recent.data} />
              <TypeBreakdown iocs={recent.data} />
            </div>
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
