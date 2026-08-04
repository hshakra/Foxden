import { shortLabel } from "../../lib/chartLabels";

// one sparkline for the whole app so every trend reads the same way
// pass showLabels to get first and last x axis labels under the line
export function Sparkline({
  points,
  width = 200,
  height = 44,
  showLabels = false,
}) {
  const max = Math.max(...points.map((p) => p.count), 1);
  const plotHeight = height - 6;
  // guard keeps a single point series from dividing by zero
  const denom = Math.max(points.length - 1, 1);
  const line = points
    .map(
      (p, i) =>
        `${(i / denom) * width},${
          plotHeight - (p.count / max) * (plotHeight - 6)
        }`,
    )
    .join(" ");

  const first = points[0]?.date ?? "";
  const last = points[points.length - 1]?.date ?? "";

  // a faint vertical line per day so the time steps are visible
  // hourly series only mark every sixth hour to stay clean
  const tickStep = points.length > 12 ? 6 : 1;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
        aria-hidden="true"
      >
        {points.map((p, i) =>
          i % tickStep === 0 ? (
            <line
              key={p.date + i}
              x1={(i / denom) * width}
              y1="2"
              x2={(i / denom) * width}
              y2={plotHeight}
              stroke="var(--color-line)"
              strokeWidth="0.75"
            />
          ) : null,
        )}
        <line
          x1="0"
          y1={plotHeight}
          x2={width}
          y2={plotHeight}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
        <polyline
          fill="rgba(113,128,185,.14)"
          stroke="none"
          points={`0,${plotHeight} ${line} ${width},${plotHeight}`}
        />
        <polyline
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          points={line}
        />
      </svg>
      {showLabels && (
        <div className="flex justify-between font-mono text-[9px] text-ink-low tabular-nums">
          <span>{shortLabel(first)}</span>
          {/* hourly buckets are utc, say so on the axis */}
          <span>{last.includes(":") ? `${last} UTC` : shortLabel(last)}</span>
        </div>
      )}
    </div>
  );
}

// tiny bars for the kpi tiles, same data shape as the sparkline
// each bar carries its own day (or hour) label underneath
export function SparkBars({ points, height = 18, showLabels = false }) {
  const max = Math.max(...points.map((p) => p.count), 1);
  // hourly series only label every sixth bar so it stays readable
  const labelEvery = points.length > 12 ? 6 : 1;
  return (
    <div>
      <div
        className="flex items-end gap-[2px]"
        style={{ height }}
        aria-hidden="true"
      >
        {points.map((p, i) => (
          <span
            key={i}
            title={`${shortLabel(p.date)}: ${p.count}`}
            className="min-h-[2px] flex-1 rounded-[1px] bg-accent/60"
            style={{ height: `${Math.max(8, (p.count / max) * 100)}%` }}
          />
        ))}
      </div>
      {showLabels &&
        (points.length > 12 ? (
          // hourly bars are too narrow for per bar labels, ends only
          <div className="flex justify-between font-mono text-[9px] text-ink-low tabular-nums">
            <span>{barLabel(points[0].date)}</span>
            <span>{barLabel(points[points.length - 1].date)} UTC</span>
          </div>
        ) : (
          <div className="flex gap-[2px] font-mono text-[9px] text-ink-low tabular-nums">
            {points.map((p, i) => (
              <span key={i} className="flex-1 truncate text-center">
                {i % labelEvery === 0 ? barLabel(p.date) : ""}
              </span>
            ))}
          </div>
        ))}
    </div>
  );
}

// "2026-08-04" reads as "8/4", hourly "17:00" reads as "17h"
// slash dates cannot be mistaken for counts
function barLabel(date) {
  if (!date) return "";
  if (date.includes(":")) return `${Number(date.slice(0, 2))}h`;
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

