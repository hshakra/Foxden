import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame, Sparkles } from "lucide-react";
import { buildDailyChart } from "../utils/processor";
import { usePrefetchFamily } from "../hooks/useFamily";
import { useRange } from "../lib/range";

// families spiking against their own trailing average, plus what just
// showed up. each chip is a precise claim, not a vibe
const MIN_TODAY = 5;
const SPIKE_FLOOR = 1.6;

export function TrendingStrip({ iocs, previous = [] }) {
  const { days } = useRange();
  const prefetchFamily = usePrefetchFamily();

  const spikes = useMemo(() => {
    if (days === 1) return [];
    const byFamily = {};
    for (const ioc of iocs) {
      (byFamily[ioc.malware_printable] ??= []).push(ioc);
    }
    const out = [];
    for (const [name, list] of Object.entries(byFamily)) {
      const daily = buildDailyChart(list, days);
      const today = daily[daily.length - 1].count;
      if (today < MIN_TODAY) continue;
      const trailing = daily.slice(0, -1);
      const avg =
        trailing.reduce((sum, d) => sum + d.count, 0) / trailing.length;
      if (avg > 0 && today / avg >= SPIKE_FLOOR) {
        out.push({ name, ratio: today / avg, today });
      }
    }
    return out.sort((a, b) => b.ratio - a.ratio).slice(0, 4);
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
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [iocs, previous]);

  if (spikes.length === 0 && fresh.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-1 p-3">
      <span className="mr-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
        <Flame size={11} className="text-warn" /> Trending
      </span>
      {spikes.map((s) => (
        <Link
          key={s.name}
          to={`/family/${encodeURIComponent(s.name)}`}
          onMouseEnter={() => prefetchFamily(s.name)}
          title={`${s.today} IOCs today vs its trailing daily average`}
          className="flex items-center gap-1.5 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink hover:border-warn/60"
        >
          {s.name}
          <b className="font-mono text-[10px] text-warn tabular-nums">
            {s.ratio.toFixed(1)}x
          </b>
        </Link>
      ))}
      {fresh.map((f) => (
        <Link
          key={f.name}
          to={`/family/${encodeURIComponent(f.name)}`}
          onMouseEnter={() => prefetchFamily(f.name)}
          title={`not seen in the previous window, ${f.count} IOCs now`}
          className="flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink hover:border-accent hover:text-accent-soft"
        >
          <Sparkles size={11} className="text-accent-soft" />
          {f.name}
          <span className="font-mono text-[9px] uppercase text-ink-3">new</span>
        </Link>
      ))}
    </div>
  );
}
