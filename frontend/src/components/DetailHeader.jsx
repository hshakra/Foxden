import { useMemo } from "react";
import { computeKpis, buildDailyChart } from "../utils/processor";
import { confidenceInfo } from "../lib/confidence";
import { parseThreatFoxDate } from "../lib/time";
import { CONF_COLORS } from "../lib/colors";


function Stat({ label, value, valueColor }) {
  return (
    <div>
      <p className="font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
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
export function DetailHeader({ icon: Icon, title, kind, iocs }) {
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const spark = useMemo(() => buildDailyChart(iocs, 14), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);

  const seen = iocs
    .map((i) => parseThreatFoxDate(i.first_seen))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const firstSeen = seen[0];

  const max = Math.max(...spark.map((d) => d.count), 1);
  const points = spark
    .map(
      (d, i) =>
        `${(i / (spark.length - 1)) * 200},${44 - (d.count / max) * 40}`,
    )
    .join(" ");

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
          valueColor={CONF_COLORS[conf.color]}
        />
        <Stat
          label="First seen"
          value={
            firstSeen
              ? firstSeen.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "—"
          }
        />

        <div className="ml-auto min-w-[200px]">
          <p className="mb-1 font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
            14-day activity
          </p>
          <svg viewBox="0 0 200 44" className="h-11 w-full" aria-hidden="true">
            <polyline
              fill="rgba(113,128,185,.14)"
              stroke="none"
              points={`0,44 ${points} 200,44`}
            />
            <polyline
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
