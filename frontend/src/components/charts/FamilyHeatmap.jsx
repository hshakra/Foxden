import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  buildDailyChart,
  buildHourlyChart,
  groupByFamily,
} from "../../lib/processor";
import { shortLabel } from "../../lib/chartLabels";
import { usePrefetchFamily } from "../../hooks/useFamily";
import { useRange } from "../../lib/range";
import { heatColor } from "../../lib/colors";
import { Group } from "../ui/Group";

// the families page hero, campaign timing at a glance
// one row per family, one cell per day (or hour at 24h)
const MAX_ROWS = 12;

export function FamilyHeatmap({ iocs }) {
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();
  const hourly = days === 1;

  const grid = useMemo(() => {
    const top = Object.entries(groupByFamily(iocs))
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, MAX_ROWS);

    const rows = top.map(([name, list]) => ({
      name,
      total: list.length,
      cells: hourly ? buildHourlyChart(list) : buildDailyChart(list, days),
    }));
    const max = Math.max(
      1,
      ...rows.flatMap((row) => row.cells.map((cell) => cell.count)),
    );
    return { rows, max, labels: rows[0]?.cells.map((c) => c.date) ?? [] };
  }, [iocs, days, hourly]);

  if (grid.rows.length === 0) return null;

  // hourly has 24 columns, label every 6th so it stays readable
  const labelEvery = hourly ? 6 : 1;

  return (
    <Group
      title="Campaign timing"
      description={
        hourly
          ? "When each family was active in UTC hours, brighter means busier"
          : "When each family was active, brighter means busier"
      }
    >
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div
            className="grid items-center gap-x-3 gap-y-[3px]"
            style={{
              gridTemplateColumns: `minmax(120px, 180px) repeat(${grid.labels.length}, 1fr) 48px`,
            }}
          >
            <span />
            {grid.labels.map((label, i) => (
              <span
                key={label}
                className="truncate text-center font-mono text-[10px] text-ink-low"
              >
                {i % labelEvery === 0 ? (hourly ? label : shortLabel(label)) : ""}
              </span>
            ))}
            <span className="text-right text-secondary font-medium text-ink-low">
              IOCs
            </span>

            {grid.rows.map((row) => (
              <Row
                key={row.name}
                row={row}
                max={grid.max}
                onHover={() => prefetchFamily(row.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </Group>
  );
}

function Row({ row, max, onHover }) {
  return (
    <>
      <Link
        to={`/family/${encodeURIComponent(row.name)}`}
        onMouseEnter={onHover}
        title={row.name}
        className="truncate text-secondary font-medium text-accent-soft hover:underline"
      >
        {row.name}
      </Link>
      {row.cells.map((cell) => (
        <span
          key={cell.date}
          title={`${row.name}, ${cell.date}: ${cell.count}`}
          className="h-[18px] rounded-[3px]"
          style={{ background: heatColor(Math.sqrt(cell.count / max) * 0.85) }}
        />
      ))}
      <span className="text-right font-mono text-meta text-ink-mid tabular-nums">
        {row.total}
      </span>
    </>
  );
}
