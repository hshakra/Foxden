import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useTitle from "../hooks/useTitle";
import useTag from "../hooks/useTag";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { isNoResult } from "../lib/api";
import { TopBar } from "../components/TopBar";
import { DetailHeader } from "../components/DetailHeader";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopFamilies } from "../components/TopFamilies";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export default function TagExplorer() {
  const { name } = useParams();
  useTitle(name);
  const tag = useTag(name);
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);

  const iocs = useMemo(() => tag.data ?? [], [tag.data]);
  // headline count from the range feed so it matches the index pages
  const rangeFeed = recent.data?.current;
  const rangeCount = useMemo(() => {
    if (!rangeFeed) return undefined;
    return rangeFeed.filter((i) => i.tags?.includes(name)).length;
  }, [rangeFeed, name]);

  return (
    <>
      <TopBar
        title={`#${name}`}
        subtitle="Tag"
        crumbs={[{ label: "Tags", to: "/tags" }, { label: name }]}
      />
      <div className="reveal flex flex-col gap-8 p-6">
        {tag.isPending ? (
          <SkeletonRows rows={8} />
        ) : tag.isError && isNoResult(tag.error) ? (
          <EmptyState
            title="No IOCs carry this tag"
            hint="ThreatFox has nothing under this tag right now."
          />
        ) : tag.isError ? (
          <ErrorState error={tag.error} onRetry={() => tag.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs carry this tag"
            hint="ThreatFox has nothing under this tag right now."
          />
        ) : (
          <>
            <DetailHeader
              kind="tag"
              iocs={iocs}
              rangeCount={rangeCount}
              watch={{ kind: "tag", name }}
            />
            <div
              className={`grid items-start gap-4 ${
                selected ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""
              }`}
            >
              <FeedTable
                iocs={iocs}
                selectedId={selected?.id}
                onSelect={setSelected}
                title="Tagged IOCs"
              />
              {selected && (
                <IOCDrawer
                  ioc={selected}
                  onClose={() => setSelected(null)}
                  pool={iocs}
                />
              )}
            </div>
            <TopFamilies iocs={iocs} />
          </>
        )}
      </div>
    </>
  );
}
