import { useMemo } from "react";
import { computeKpis, typeDistribution } from "../utils/processor";
import { confidenceInfo } from "../lib/confidence";
import { useRange } from "../lib/range";
import { CONF_COLORS, typeColor } from "../lib/colors";

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-widest text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-ink-3">{sub}</p>}
    </div>
  );
}

// the top strip of the overview
// every headline metric shows exactly once, plus the type distribution bar
export function SignalStrip({ iocs }) {
  const { days } = useRange();
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const dist = useMemo(() => typeDistribution(iocs), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_1fr_1fr_1fr_1.7fr]">
      <Kpi
        label={`IOCs · ${days}d`}
        value={kpis.total.toLocaleString()}
        sub="first seen in range"
      />
      <Kpi
        label="Families"
        value={kpis.familyCount.toLocaleString()}
        sub="active in range"
      />
      <Kpi
        label="Tags"
        value={kpis.tagCount.toLocaleString()}
        sub="unique in range"
      />
      <div className="rounded-xl border border-line bg-surface-1 px-3.5 py-3">
        <p className="text-[10px] uppercase tracking-widest text-ink-3">
          Avg confidence
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
          {kpis.avgConfidence}
        </p>
        <p
          className="mt-0.5 font-mono text-[9.5px] font-bold"
          style={{ color: CONF_COLORS[conf.color] }}
        >
          {conf.label}
        </p>
      </div>

      <div className="col-span-2 flex flex-col justify-center gap-2 rounded-xl border border-line bg-surface-1 px-3.5 py-3 lg:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-ink-3">
          IOC type distribution
        </p>
        <div className="flex h-2.5 overflow-hidden rounded-md">
          {dist.map((d) => (
            <div
              key={d.type}
              title={`${d.type} ${d.pct}%`}
              style={{
                width: `${d.pct}%`,
                background: typeColor(d.type),
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-ink-2">
          {dist.map((d) => (
            <span key={d.type} className="flex items-center gap-1.5">
              <span
                className="h-[7px] w-[7px] rounded-[2px]"
                style={{
                  background: typeColor(d.type),
                }}
              />
              {d.type} <b className="text-ink tabular-nums">{d.pct}%</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
