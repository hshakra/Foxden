import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Tag } from "lucide-react";
import useTag from "../hooks/useTag";
import { isNoResult } from "../lib/api";
import { TopBar } from "../components/TopBar";
import { DetailHeader } from "../components/DetailHeader";
import { FeedTable } from "../components/FeedTable";
import { IOCDrawer } from "../components/IOCDrawer";
import { TopFamilies } from "./TopFamilies.jsx";
import { SkeletonRows, ErrorState, EmptyState } from "../components/states";

export default function TagExplorer() {
  const { name } = useParams();
  const tag = useTag(name);
  const [selected, setSelected] = useState(null);

  const iocs = useMemo(() => tag.data ?? [], [tag.data]);

  return (
    <>
      <TopBar
        title={`#${name}`}
        subtitle="campaign tag"
        crumbs={[{ label: "Tags", to: "/tags" }, { label: name }]}
      />
      <div className="reveal flex flex-col gap-6 p-5">
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
              icon={Tag}
              title={`#${name}`}
              kind="campaign tag"
              iocs={iocs}
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
                <IOCDrawer ioc={selected} onClose={() => setSelected(null)} />
              )}
            </div>
            <TopFamilies iocs={iocs} />
          </>
        )}
      </div>
    </>
  );
}
