import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buildDailyChart } from "../utils/processor";
import { typeColor } from "../lib/colors";
import { useRange } from "../lib/range";
import { usePrefetchFamily } from "../hooks/useFamily";
import { Sparkline } from "../components/charts/Sparkline";
import { sparkRange } from "../lib/chartLabels";
import { TypeLegend } from "../components/charts/TypeLegend";

// family leaderboard for the overview
// each row carries its own trend line and type mix so a spike or an
// infrastructure shift is visible without leaving the page

function MixBar({ mix }) {
  return (
    <span className="flex h-[5px] w-14 gap-[2px]" title={mix.title}>
      {mix.parts.map((p) => (
        <span
          key={p.type}
          className="rounded-[1px]"
          style={{ width: `${p.pct}%`, background: typeColor(p.type) }}
        />
      ))}
    </span>
  );
}

export function TopFamilies({ iocs }) {
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();

  const rows = useMemo(() => {
    // bucket every ioc by family first
    const byFamily = {};
    for (const ioc of iocs) {
      (byFamily[ioc.malware_printable] ??= []).push(ioc);
    }
    return Object.entries(byFamily)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6)
      .map(([name, list]) => {
        const typeCounts = {};
        for (const ioc of list) {
          const t = ioc.ioc_type.endsWith("_hash") ? "hash" : ioc.ioc_type;
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        const parts = Object.entries(typeCounts).map(([type, count]) => ({
          type,
          pct: Math.round((count / list.length) * 100),
        }));
        return {
          name,
          count: list.length,
          spark: buildDailyChart(list, Math.max(days, 7)),
          mix: {
            parts,
            title: parts.map((p) => `${p.type} ${p.pct}%`).join(", "),
          },
        };
      });
  }, [iocs, days]);

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h4 className="text-[14px] font-semibold">Top families</h4>
        <TypeLegend />
        <Link
          to="/families"
          className="ml-auto font-mono text-[10px] text-accent-soft hover:underline"
        >
          all families
        </Link>
      </div>
      <div
        role="table"
        className="grid grid-cols-[16px_minmax(0,1fr)_76px_60px_40px] items-center gap-x-3"
      >
        <span />
        <span />
        <span className="pb-1 text-[10.5px] font-medium text-ink-3">
          {rows[0] ? sparkRange(rows[0].spark) : "trend"}
        </span>
        <span className="pb-1 text-[10.5px] font-medium text-ink-3">
          mix
        </span>
        <span className="pb-1 text-right text-[10.5px] font-medium text-ink-3">
          iocs
        </span>
        {rows.map((f, i) => (
          <Link
            key={f.name}
            to={`/family/${encodeURIComponent(f.name)}`}
            onMouseEnter={() => prefetchFamily(f.name)}
            className="col-span-5 grid grid-cols-subgrid items-center border-t border-line py-1.5 hover:bg-surface-2/50"
          >
            <span className="font-mono text-[10px] text-ink-3 tabular-nums">
              {i + 1}
            </span>
            <span
              className="truncate text-xs font-semibold text-accent-soft"
              title={f.name}
            >
              {f.name}
            </span>
            <span className="w-[72px]">
              <Sparkline points={f.spark} width={72} height={22} />
            </span>
            <MixBar mix={f.mix} />
            <span className="text-right font-mono text-[10px] text-ink-2 tabular-nums">
              {f.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
