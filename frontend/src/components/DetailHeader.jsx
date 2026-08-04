import { useMemo } from "react";
import { computeKpis, buildDailyChart } from "../utils/processor";
import { Sparkline } from "./charts/Sparkline";
import { confidenceInfo } from "../lib/confidence";
import { parseThreatFoxDate } from "../lib/time";
import { CONF_COLORS } from "../lib/colors";
import { WatchButton } from "./WatchButton";
import { Group } from "./ui/Group";
import { StatTile } from "./ui/StatTile";
import { sparkRange } from "../lib/chartLabels";

// stat band for the family and tag pages, the page title lives in the top bar
export function DetailHeader({ kind, iocs, watch }) {
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const spark = useMemo(() => buildDailyChart(iocs, 14), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);

  const seen = iocs
    .map((i) => parseThreatFoxDate(i.first_seen))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const firstSeen = seen[0];
  const recentTotal = spark.reduce((sum, d) => sum + d.count, 0);

  return (
    <Group
      title="At a glance"
      description={`What this ${kind} looks like right now`}
      actions={watch && <WatchButton kind={watch.kind} name={watch.name} />}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="IOCs"
          value={kpis.total.toLocaleString()}
          comparison="in the loaded records"
        />
        <StatTile
          label="Average confidence"
          value={kpis.avgConfidence}
          comparison={
            <span>
              <span
                style={{
                  color:
                    conf.tone === "quiet" ? undefined : CONF_COLORS[conf.tone],
                }}
              >
                {conf.label}
              </span>
              {" on a 0 to 100 scale"}
            </span>
          }
        />
        <StatTile
          label="First seen"
          value={
            firstSeen ? (
              <span className="block truncate font-sans">
                {firstSeen.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            ) : undefined
          }
          comparison="oldest loaded record"
        />
        <StatTile
          label="14-day activity"
          value={recentTotal.toLocaleString()}
          comparison={sparkRange(spark)}
          spark={<Sparkline points={spark} showLabels />}
        />
      </div>
    </Group>
  );
}
