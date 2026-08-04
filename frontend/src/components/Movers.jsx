import { useMemo } from "react";
import { Link } from "react-router-dom";
import { buildDailyChart, groupByFamily } from "../lib/processor";
import { usePrefetchFamily } from "../hooks/useFamily";
import { useRange } from "../lib/range";
import { sparkRange } from "../lib/chartLabels";
import { table } from "../lib/table";
import { Sparkline } from "./charts/Sparkline";

// who is surging and what just appeared, two compact tables
// a spike is a precise claim, today against the trailing daily average
const MIN_TODAY = 5;
const SPIKE_FLOOR = 1.6;
const LIMIT = 5;

export function Movers({ iocs, previous = [] }) {
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();

  const spikes = useMemo(() => {
    if (days === 1) return [];
    const out = [];
    for (const [name, list] of Object.entries(groupByFamily(iocs))) {
      const daily = buildDailyChart(list, days);
      const today = daily[daily.length - 1].count;
      if (today < MIN_TODAY) continue;
      const trailing = daily.slice(0, -1);
      const avg =
        trailing.reduce((sum, d) => sum + d.count, 0) / trailing.length;
      if (avg > 0 && today / avg >= SPIKE_FLOOR) {
        out.push({ name, ratio: today / avg, today, daily });
      }
    }
    return out.sort((a, b) => b.ratio - a.ratio).slice(0, LIMIT);
  }, [iocs, days]);

  const fresh = useMemo(() => {
    if (previous.length === 0) return [];
    const before = new Set(previous.map((i) => i.malware_printable));
    const counts = {};
    for (const ioc of iocs) {
      if (!before.has(ioc.malware_printable)) {
        counts[ioc.malware_printable] =
          (counts[ioc.malware_printable] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIMIT)
      .map(([name, count]) => ({ name, count }));
  }, [iocs, previous]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="text-body font-medium">Spiking</p>
        <p className="text-meta text-ink-low">
          Today against the family's own trailing daily average
        </p>
        {days === 1 ? (
          <p className="mt-3 text-secondary text-ink-low">
            Spike detection needs a range of at least 3 days.
          </p>
        ) : spikes.length === 0 ? (
          <p className="mt-3 text-secondary text-ink-low">
            No family is spiking right now.
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse">
            <thead className={table.header}>
              <tr>
                <th className={table.headerCell}>Family</th>
                <th className={table.headerCell}>
                  {sparkRange(spikes[0].daily)}
                </th>
                <th className={table.headerCellNum}>Vs avg</th>
                <th className={table.headerCellNum}>Today</th>
              </tr>
            </thead>
            <tbody>
              {spikes.map((s) => (
                <tr key={s.name} className={table.row}>
                  <td className={`${table.cell} max-w-0`}>
                    <Link
                      to={`/family/${encodeURIComponent(s.name)}`}
                      onMouseEnter={() => prefetchFamily(s.name)}
                      className="block truncate font-medium text-accent-soft hover:underline"
                      title={s.name}
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className={`${table.cell} w-24`}>
                    <Sparkline points={s.daily} width={72} height={22} />
                  </td>
                  <td className={`${table.cellNum} w-20`}>
                    {s.ratio.toFixed(1)}x
                  </td>
                  <td className={`${table.cellNum} w-16`}>{s.today}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-body font-medium">New in range</p>
        <p className="text-meta text-ink-low">
          Families with no activity in the previous window
        </p>
        {previous.length === 0 ? (
          <p className="mt-3 text-secondary text-ink-low">
            Needs a comparison window, pick 24h or 3d.
          </p>
        ) : fresh.length === 0 ? (
          <p className="mt-3 text-secondary text-ink-low">
            No new families in this range.
          </p>
        ) : (
          <table className="mt-2 w-full border-collapse">
            <thead className={table.header}>
              <tr>
                <th className={table.headerCell}>Family</th>
                <th className={table.headerCellNum}>IOCs</th>
              </tr>
            </thead>
            <tbody>
              {fresh.map((f) => (
                <tr key={f.name} className={table.row}>
                  <td className={`${table.cell} max-w-0`}>
                    <Link
                      to={`/family/${encodeURIComponent(f.name)}`}
                      onMouseEnter={() => prefetchFamily(f.name)}
                      className="block truncate font-medium text-accent-soft hover:underline"
                      title={f.name}
                    >
                      {f.name}
                    </Link>
                  </td>
                  <td className={`${table.cellNum} w-16`}>{f.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
