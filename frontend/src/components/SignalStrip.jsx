import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  computeKpis,
  typeDistribution,
  threatDistribution,
  buildActivitySeries,
  newFamilies,
} from "../utils/processor";
import { confidenceInfo } from "../lib/confidence";
import { useRange } from "../lib/range";
import {
  CONF_COLORS,
  typeColor,
  threatColor,
  THREAT_LABELS,
} from "../lib/colors";
import { StatTile } from "./StatTile";
import { SparkBars } from "./charts/Sparkline";

// the top strip of the overview
// every headline metric shows exactly once, each tile carries its own
// context, and both composition bars filter the feed on click

function Delta({ now, before }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return null;
  const Icon = pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="mt-0.5 flex items-center gap-1 font-mono text-[9.5px] text-ink-2 tabular-nums">
      <Icon size={11} />
      {Math.abs(pct)}% vs prev
    </span>
  );
}

function Bar({ parts, colorFor, labelFor, onClick }) {
  return (
    <>
      <div className="flex h-2 gap-[3px]">
        {parts.map((d) => (
          <button
            key={d.type}
            type="button"
            title={`Filter feed to ${labelFor(d.type)}`}
            onClick={() => onClick?.(d.type)}
            className="rounded-sm transition-transform hover:scale-y-125"
            style={{ width: `${d.pct}%`, background: colorFor(d.type) }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-[8.5px] text-ink-2">
        {parts.map((d) => (
          <span key={d.type} className="flex items-center gap-1">
            <span
              className="h-[6px] w-[6px] rounded-[2px]"
              style={{ background: colorFor(d.type) }}
            />
            {labelFor(d.type)}{" "}
            <b className="text-ink tabular-nums">{d.pct}%</b>
          </span>
        ))}
      </div>
    </>
  );
}

export function SignalStrip({ iocs, previous = [], onTypeClick, onThreatClick }) {
  const { days } = useRange();
  const navigate = useNavigate();
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const prevKpis = useMemo(() => computeKpis(previous), [previous]);
  const activity = useMemo(
    () => buildActivitySeries(iocs, days),
    [iocs, days],
  );
  const types = useMemo(() => typeDistribution(iocs), [iocs]);
  const threats = useMemo(() => threatDistribution(iocs), [iocs]);
  const conf = confidenceInfo(kpis.avgConfidence);
  const hasPrev = previous.length > 0;

  const freshFamilies = useMemo(
    () => (hasPrev ? newFamilies(iocs, previous) : 0),
    [iocs, previous, hasPrev],
  );
  const singleUseTags = useMemo(() => countSingleUse(iocs), [iocs]);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_1fr_1fr_1fr_1.9fr]">
      <StatTile
        label={`IOCs · ${days === 1 ? "24h" : `${days}d`}`}
        value={kpis.total.toLocaleString()}
        onClick={() =>
          document
            .getElementById("ioc-feed")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      >
        <div className="mt-1.5">
          <SparkBars points={activity} height={16} showLabels />
        </div>
        {hasPrev && <Delta now={kpis.total} before={prevKpis.total} />}
      </StatTile>

      <StatTile
        label="Families"
        value={kpis.familyCount.toLocaleString()}
        onClick={() => navigate("/families")}
      >
        <p className="mt-0.5 font-mono text-[9.5px] text-ink-2 tabular-nums">
          {hasPrev
            ? `${freshFamilies} new in range`
            : `top: ${topFamilyName(iocs)}`}
        </p>
      </StatTile>

      <StatTile
        label="Tags"
        value={kpis.tagCount.toLocaleString()}
        onClick={() => navigate("/tags")}
      >
        <p className="mt-0.5 font-mono text-[9.5px] text-ink-2 tabular-nums">
          {singleUseTags} used only once
        </p>
      </StatTile>

      <StatTile label="Avg confidence" value={kpis.avgConfidence}>
        <p
          className="mt-0.5 font-mono text-[9.5px] font-bold"
          style={{ color: CONF_COLORS[conf.tone] }}
        >
          {conf.label}
        </p>
      </StatTile>

      <div className="col-span-2 flex flex-col justify-center gap-1.5 rounded-xl border border-line bg-surface-1 px-3.5 py-2.5 lg:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-ink-3">
          Composition
          <span className="ml-2 normal-case tracking-normal">
            click to filter the feed
          </span>
        </p>
        <Bar
          parts={types}
          colorFor={typeColor}
          labelFor={(t) => t}
          onClick={onTypeClick}
        />
        <Bar
          parts={threats.slice(0, 4)}
          colorFor={threatColor}
          labelFor={(t) => THREAT_LABELS[t] ?? t}
          onClick={onThreatClick}
        />
      </div>
    </div>
  );
}

// busiest family in range, the 7d fallback when no comparison window exists
function topFamilyName(iocs) {
  const counts = {};
  for (const ioc of iocs) {
    counts[ioc.malware_printable] = (counts[ioc.malware_printable] || 0) + 1;
  }
  let best = "";
  for (const name in counts) {
    if (!best || counts[name] > counts[best]) best = name;
  }
  return best;
}

// tags that appear exactly once, a rough noise measure
function countSingleUse(iocs) {
  const counts = {};
  for (const ioc of iocs) {
    for (const tag of ioc.tags ?? []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  let n = 0;
  for (const tag in counts) if (counts[tag] === 1) n += 1;
  return n;
}
