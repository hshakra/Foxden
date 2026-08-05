import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { computeKpis, buildDailyChart } from "../lib/processor";
import { Sparkline } from "./charts/Sparkline";
import { confidenceInfo } from "../lib/confidence";
import { parseThreatFoxDate } from "../lib/time";
import { CONF_COLORS } from "../lib/colors";
import { WatchButton } from "./WatchButton";
import { Group } from "./ui/Group";
import { StatTile } from "./ui/StatTile";

// stat band for the family and tag pages, the page title lives in the top bar
// the headline count comes from the range feed so it matches every other
// page, the rest is computed over the latest records threatfox returns
export function DetailHeader({ kind, iocs, rangeCount, watch }) {
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);

  const seen = iocs
    .map((i) => parseThreatFoxDate(i.first_seen))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const firstSeen = seen[0];
  const lastSeen = seen[seen.length - 1];

  // never chart days the loaded records cannot cover
  const spanDays =
    firstSeen && lastSeen
      ? Math.min(
          14,
          Math.ceil((lastSeen.getTime() - firstSeen.getTime()) / 86400000) + 1,
        )
      : 14;
  const spark = useMemo(
    () => buildDailyChart(iocs, Math.max(spanDays, 2)),
    [iocs, spanDays],
  );
  const loadedLabel = `of the latest ${iocs.length.toLocaleString()} records`;

  // threatfox has a page per family, keyed by the malware id on every record
  const malwareId =
    kind === "family" && iocs[0]?.malware !== "unknown" ? iocs[0]?.malware : null;

  return (
    <Group
      title="At a glance"
      description={`What this ${kind} looks like right now`}
      actions={
        <>
          {malwareId && (
            <a
              href={`https://threatfox.abuse.ch/browse/malware/${encodeURIComponent(malwareId)}/`}
              target="_blank"
              rel="noreferrer"
              title={`This family on ThreatFox, ${malwareId}`}
              className="flex items-center gap-1.5 rounded-md border border-line bg-lifted px-2.5 py-1.5 text-secondary font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
            >
              <ExternalLink size={12} /> ThreatFox
            </a>
          )}
          {watch && <WatchButton kind={watch.kind} name={watch.name} />}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="IOCs in range"
          value={rangeCount?.toLocaleString()}
          comparison="matches the selected time range"
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
          label="Oldest loaded"
          value={
            firstSeen ? (
              <span className="block truncate font-sans">
                {firstSeen.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : undefined
          }
          comparison={loadedLabel}
        />
        <StatTile
          label="Daily activity"
          value={iocs.length.toLocaleString()}
          comparison={loadedLabel}
          spark={<Sparkline points={spark} showLabels />}
        />
      </div>
    </Group>
  );
}
