import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Shield } from "lucide-react";
import useFamily from "../hooks/useFamily";
import { isNoResult } from "../lib/api";
import { TopBar } from "../components/TopBar";
import { DetailHeader } from "../components/DetailHeader";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopTags } from "./TopTags.jsx";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export function FamilyProfile() {
  const { name } = useParams();
  const family = useFamily(name);
  const [selected, setSelected] = useState(null);

  const iocs = useMemo(() => family.data ?? [], [family.data]);

  return (
    <>
      <TopBar title={name} subtitle="malware family" />
      <div className="reveal flex flex-col gap-6 p-5">
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
              icon={Shield}
              title={name}
              kind="malware family"
              iocs={iocs}
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
              />
              {selected && (
                <IOCDrawer ioc={selected} onClose={() => setSelected(null)} />
              )}
            </div>
            <TopTags iocs={iocs} />
          </>
        )}
      </div>
    </>
  );
}
