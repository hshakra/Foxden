import { useMemo } from "react";
import { computeKpis, buildDailyChart } from "../utils/processor";
import { Sparkline } from "./charts/Sparkline";
import { confidenceInfo } from "../lib/confidence";
import { parseThreatFoxDate } from "../lib/time";
import { CONF_COLORS } from "../lib/colors";
import { WatchButton } from "./WatchButton";

function Stat({ label, value, valueColor }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-ink-3">
        {label}
      </p>
      <p
        className="mt-0.5 text-lg font-bold tracking-tight tabular-nums"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// header for the family and tag pages, identity plus stats plus a sparkline
export function DetailHeader({ icon: Icon, title, kind, iocs, watch }) {
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const spark = useMemo(() => buildDailyChart(iocs, 14), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);

  const seen = iocs
    .map((i) => parseThreatFoxDate(i.first_seen))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const firstSeen = seen[0];

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-content-center rounded-xl border border-line-2 bg-surface-2 text-accent-soft">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <p className="font-mono text-[10px] text-ink-3">{kind}</p>
          </div>
        </div>

        <Stat label="IOCs" value={kpis.total.toLocaleString()} />
        <Stat
          label="Avg confidence"
          value={`${kpis.avgConfidence} ${conf.label}`}
          valueColor={
            conf.tone === "quiet" ? undefined : CONF_COLORS[conf.tone]
          }
        />
        <Stat
          label="First seen"
          value={
            firstSeen
              ? firstSeen.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "n/a"
          }
        />

        <div className="ml-auto flex items-center gap-5">
          {watch && <WatchButton kind={watch.kind} name={watch.name} />}
          <div className="min-w-[200px]">
            <p className="mb-1 text-[11px] font-medium text-ink-3">
              14-day activity
            </p>
            <Sparkline points={spark} showLabels />
          </div>
        </div>
      </div>
    </div>
  );
}
