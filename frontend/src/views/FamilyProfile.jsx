import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useTitle from "../hooks/useTitle";
import useFamily from "../hooks/useFamily";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { isNoResult } from "../lib/api";
import { TopBar } from "../components/TopBar";
import { DetailHeader } from "../components/DetailHeader";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopTags } from "../components/TopTags";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export default function FamilyProfile() {
  const { name } = useParams();
  useTitle(name);
  const family = useFamily(name);
  const recent = useRecentIOCs();
  const [selected, setSelected] = useState(null);

  const iocs = useMemo(() => family.data ?? [], [family.data]);
  // headline count from the range feed so it matches the index pages
  const rangeFeed = recent.data?.current;
  const rangeCount = useMemo(() => {
    if (!rangeFeed) return undefined;
    return rangeFeed.filter((i) => i.malware_printable === name).length;
  }, [rangeFeed, name]);

  return (
    <>
      <TopBar
        title={name}
        subtitle="Malware family"
        crumbs={[{ label: "Families", to: "/families" }, { label: name }]}
      />
      <div
        key={family.isPending ? "loading" : "ready"}
        className="reveal flex flex-col gap-8 p-6"
      >
        {family.isPending ? (
          <SkeletonRows rows={8} />
        ) : family.isError && isNoResult(family.error) ? (
          <EmptyState
            title="No IOCs recorded for this family"
            hint="ThreatFox has nothing under this name right now."
          />
        ) : family.isError ? (
          <ErrorState error={family.error} onRetry={() => family.refetch()} />
        ) : iocs.length === 0 ? (
          <EmptyState
            title="No IOCs recorded for this family"
            hint="ThreatFox has nothing under this name right now."
          />
        ) : (
          <>
            <DetailHeader
              kind="family"
              iocs={iocs}
              rangeCount={rangeCount}
              watch={{ kind: "family", name }}
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
                title="IOCs"
                cluster={false}
                showFamily={false}
              />
              {selected && (
                <IOCDrawer
                  ioc={selected}
                  onClose={() => setSelected(null)}
                  pool={iocs}
                />
              )}
            </div>
            <TopTags iocs={iocs} />
          </>
        )}
      </div>
    </>
  );
}
