import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buildDailyChart, buildHourlyChart } from "../../utils/processor";
import { shortLabel } from "../../lib/chartLabels";
import { usePrefetchFamily } from "../../hooks/useFamily";
import { useRange } from "../../lib/range";
import { heatColor } from "../../lib/colors";

// the families page hero, campaign timing at a glance
// one row per family, one cell per day (or hour at 24h), darker means busier
const MAX_ROWS = 12;

export function FamilyHeatmap({ iocs }) {
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();
  const hourly = days === 1;

  const grid = useMemo(() => {
    const byFamily = {};
    for (const ioc of iocs) {
      (byFamily[ioc.malware_printable] ??= []).push(ioc);
    }
    const top = Object.entries(byFamily)
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
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h4 className="text-[14px] font-semibold">Campaign timing</h4>
        <span className="text-xs text-ink-2">When each family was active, brighter means busier</span>
      </div>
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
                className="truncate text-center font-mono text-[8px] text-ink-3"
              >
                {i % labelEvery === 0 ? (hourly ? label : shortLabel(label)) : ""}
              </span>
            ))}
            <span className="text-right text-[10.5px] font-medium text-ink-3">
              iocs
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
    </div>
  );
}

function Row({ row, max, onHover }) {
  return (
    <>
      <Link
        to={`/family/${encodeURIComponent(row.name)}`}
        onMouseEnter={onHover}
        title={row.name}
        className="truncate text-xs font-semibold text-accent-soft hover:underline"
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
      <span className="text-right font-mono text-[10px] text-ink-2 tabular-nums">
        {row.total}
      </span>
    </>
  );
}
