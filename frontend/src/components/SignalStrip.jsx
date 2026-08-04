import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { computeKpis, typeDistribution } from "../utils/processor";
import { confidenceInfo } from "../lib/confidence";
import { useRange } from "../lib/range";
import { CONF_COLORS, typeColor } from "../lib/colors";

// the top strip of the overview
// every headline metric shows exactly once, with change vs the previous
// period when the range allows it, and every tile leads somewhere

function Delta({ now, before }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return null;
  const Icon = pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 font-mono text-[9.5px] text-ink-2 tabular-nums">
      <Icon size={11} />
      {Math.abs(pct)}% vs prev
    </span>
  );
}

function Kpi({ label, value, sub, delta, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-line bg-surface-1 px-3.5 py-3 text-left transition-colors hover:border-line-2 hover:bg-surface-2/40"
    >
      <p className="text-[10px] uppercase tracking-widest text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {delta ?? (
        <p className="mt-0.5 font-mono text-[9.5px] text-ink-3">{sub}</p>
      )}
    </button>
  );
}

export function SignalStrip({ iocs, previous = [], onTypeClick }) {
  const { days } = useRange();
  const navigate = useNavigate();
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const prevKpis = useMemo(() => computeKpis(previous), [previous]);
  const dist = useMemo(() => typeDistribution(iocs), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);
  const hasPrev = previous.length > 0;

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_1fr_1fr_1fr_1.7fr]">
      <Kpi
        label={`IOCs · ${days}d`}
        value={kpis.total.toLocaleString()}
        sub="first seen in range"
        delta={hasPrev && <Delta now={kpis.total} before={prevKpis.total} />}
        onClick={() =>
          document
            .getElementById("ioc-feed")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />
      <Kpi
        label="Families"
        value={kpis.familyCount.toLocaleString()}
        sub="active in range"
        delta={
          hasPrev && (
            <Delta now={kpis.familyCount} before={prevKpis.familyCount} />
          )
        }
        onClick={() => navigate("/families")}
      />
      <Kpi
        label="Tags"
        value={kpis.tagCount.toLocaleString()}
        sub="unique in range"
        delta={
          hasPrev && <Delta now={kpis.tagCount} before={prevKpis.tagCount} />
        }
        onClick={() => navigate("/tags")}
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
          <span className="ml-2 normal-case tracking-normal text-ink-3">
            click to filter the feed
          </span>
        </p>
        <div className="flex h-2.5 gap-[3px]">
          {dist.map((d) => (
            <button
              key={d.type}
              type="button"
              title={`Filter feed to ${d.type}`}
              onClick={() => onTypeClick?.(d.type)}
              className="rounded-sm transition-transform hover:scale-y-125"
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
                style={{ background: typeColor(d.type) }}
              />
              {d.type} <b className="text-ink tabular-nums">{d.pct}%</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
