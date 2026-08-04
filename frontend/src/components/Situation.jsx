import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  computeKpis,
  buildActivitySeries,
  newFamilies,
  topFamilyName,
  countSingleUseTags,
} from "../lib/processor";
import { confidenceInfo } from "../lib/confidence";
import { useRange } from "../lib/range";
import { CONF_COLORS } from "../lib/colors";
import { StatTile } from "./ui/StatTile";
import { SparkBars } from "./charts/Sparkline";

// the four headline tiles of the overview, one shared shape and baseline
// every number carries its own comparison so nothing stands alone

function Delta({ now, before }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span>flat vs the previous window</span>;
  const Icon = pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <Icon size={12} />
      {Math.abs(pct)}% vs the previous window
    </span>
  );
}

export function Situation({ iocs, previous = [] }) {
  const { days } = useRange();
  const navigate = useNavigate();
  const kpis = useMemo(() => computeKpis(iocs), [iocs]);
  const prevKpis = useMemo(() => computeKpis(previous), [previous]);
  const activity = useMemo(() => buildActivitySeries(iocs, days), [iocs, days]);
  const conf = confidenceInfo(kpis.avgConfidence);
  const hasPrev = previous.length > 0;

  const freshFamilies = useMemo(
    () => (hasPrev ? newFamilies(iocs, previous) : 0),
    [iocs, previous, hasPrev],
  );
  const singleUseTags = useMemo(() => countSingleUseTags(iocs), [iocs]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="IOCs"
        value={kpis.total.toLocaleString()}
        comparison={
          hasPrev ? (
            <Delta now={kpis.total} before={prevKpis.total} />
          ) : (
            <span>past {days} days</span>
          )
        }
        spark={<SparkBars points={activity} height={20} showLabels />}
        onClick={() =>
          document
            .getElementById("ioc-feed")
            ?.scrollIntoView({ behavior: "smooth" })
        }
      />

      <StatTile
        label="Families"
        value={kpis.familyCount.toLocaleString()}
        comparison={
          hasPrev
            ? `${freshFamilies} new in range`
            : `busiest in range: ${topFamilyName(iocs)}`
        }
        onClick={() => navigate("/families")}
      />

      <StatTile
        label="Tags"
        value={kpis.tagCount.toLocaleString()}
        comparison={`${singleUseTags} used only once`}
        onClick={() => navigate("/tags")}
      />

      <StatTile
        label="Average confidence"
        value={kpis.avgConfidence}
        comparison={
          <span>
            <span style={{ color: CONF_COLORS[conf.tone] }}>{conf.label}</span>
            {" on a 0 to 100 scale"}
          </span>
        }
      />
    </div>
  );
}
