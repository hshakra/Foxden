import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buildDailyChart, groupByFamily, familyTypeMix } from "../lib/processor";
import { typeColor } from "../lib/colors";
import { useRange } from "../lib/range";
import { usePrefetchFamily } from "../hooks/useFamily";
import { Sparkline } from "../components/charts/Sparkline";
import { sparkRange } from "../lib/chartLabels";
import { TypeLegend } from "../components/charts/TypeLegend";
import { Group } from "../components/ui/Group";

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
    return Object.entries(groupByFamily(iocs))
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6)
      .map(([name, list]) => {
        const parts = familyTypeMix(list);
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
    <Group
      title="Top families"
      description="Busiest in range, with trend and type mix"
      actions={
        <Link
          to="/families"
          className="text-secondary text-accent-soft hover:underline"
        >
          All families
        </Link>
      }
    >
      <div className="mb-1.5">
        <TypeLegend />
      </div>
      <div
        role="table"
        className="grid grid-cols-[16px_minmax(0,1fr)_92px_60px_40px] items-center gap-x-3"
      >
        <span />
        <span />
        <span className="pb-1 text-secondary font-medium whitespace-nowrap text-ink-low">
          {rows[0] ? sparkRange(rows[0].spark) : "Trend"}
        </span>
        <span className="pb-1 text-secondary font-medium text-ink-low">
          Mix
        </span>
        <span className="pb-1 text-right text-secondary font-medium text-ink-low">
          IOCs
        </span>
        {rows.map((f, i) => (
          <Link
            key={f.name}
            to={`/family/${encodeURIComponent(f.name)}`}
            onMouseEnter={() => prefetchFamily(f.name)}
            className="col-span-5 grid grid-cols-subgrid items-center border-t border-line py-1.5 transition-colors duration-150 hover:bg-raised"
          >
            <span className="font-mono text-meta text-ink-low tabular-nums">
              {i + 1}
            </span>
            <span
              className="truncate text-body font-medium text-accent-soft"
              title={f.name}
            >
              {f.name}
            </span>
            <span className="w-[88px]">
              <Sparkline points={f.spark} width={88} height={22} />
            </span>
            <MixBar mix={f.mix} />
            <span className="text-right font-mono text-meta text-ink-mid tabular-nums">
              {f.count}
            </span>
          </Link>
        ))}
      </div>
    </Group>
  );
}
