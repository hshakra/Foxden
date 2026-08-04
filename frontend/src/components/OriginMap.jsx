import { useMemo, useState } from "react";
import DottedMap from "dotted-map";
import useGeo from "../hooks/useGeo";
import {
  extractIPs,
  ipConfidenceMap,
  buildDailyChart,
} from "../utils/processor";
import { useRange } from "../lib/range";
import { Skeleton } from "./states";

// the overview hero, malicious ip origins on a dotted world map
// toggles between volume (how many) and confidence (how certain)

// build the world grid once, it never changes
const worldMap = new DottedMap({ height: 50, grid: "diagonal" });
const WORLD_POINTS = worldMap.getPoints();
const MAP_W = Math.max(...WORLD_POINTS.map((p) => p.x)) + 2;
const MAP_H = Math.max(...WORLD_POINTS.map((p) => p.y)) + 2;

const MODES = ["Volume", "Confidence"];

function confidenceColor(avg) {
  if (avg >= 75) return "var(--color-good)";
  if (avg >= 50) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function OriginMap({ iocs }) {
  const [mode, setMode] = useState("Volume");
  const { days } = useRange();
  const ips = useMemo(() => extractIPs(iocs), [iocs]);
  const confByIp = useMemo(() => ipConfidenceMap(iocs), [iocs]);
  const geo = useGeo(ips);
  // a disabled query never resolves, so track the no-ips case ourselves
  const loading = ips.length > 0 && geo.isPending;

  // activity sparkline for the side panel
  const spark = useMemo(
    () => buildDailyChart(iocs, Math.max(days, 7)),
    [iocs, days],
  );
  const sparkMax = Math.max(...spark.map((d) => d.count), 1);
  const sparkPoints = spark
    .map(
      (d, i) =>
        `${(i / (spark.length - 1)) * 200},${44 - (d.count / sparkMax) * 38}`,
    )
    .join(" ");

  // group by country with count, average confidence, and pin position
  const origins = useMemo(() => {
    if (!geo.data) return [];
    const byCountry = {};
    for (const row of geo.data) {
      const entry = (byCountry[row.countryCode] ??= {
        code: row.countryCode,
        name: row.country,
        count: 0,
        confSum: 0,
        lat: row.lat,
        lon: row.lon,
      });
      entry.count += 1;
      entry.confSum += confByIp[row.ip] ?? 0;
    }
    return Object.values(byCountry)
      .map((c) => ({ ...c, avgConf: Math.round(c.confSum / c.count) }))
      .sort((a, b) => b.count - a.count);
  }, [geo.data, confByIp]);

  const top = origins.slice(0, 6);
  const maxCount = top[0]?.count ?? 1;

  const pins = useMemo(
    () =>
      origins.slice(0, 24).map((c) => ({
        ...c,
        ...worldMap.getPin({ lat: c.lat, lng: c.lon }),
      })),
    [origins],
  );

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Live origin map</h4>
        <span className="font-mono text-[10px] text-ink-3">
          malicious IPs by geolocation
        </span>
        <div
          className="ml-auto flex overflow-hidden rounded-lg border border-line font-mono text-[10px]"
          role="radiogroup"
          aria-label="Map metric"
        >
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 transition-colors ${
                mode === m
                  ? "bg-surface-2 text-ink"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_215px]">
        <div className="overflow-hidden rounded-lg border border-line bg-gradient-to-b from-surface-1 to-surface-2">
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <svg
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              className="block h-auto w-full"
              aria-label="World map of malicious IP origins"
            >
              {WORLD_POINTS.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={0.32}
                  fill="var(--color-accent-soft)"
                  opacity={0.28}
                />
              ))}
              {pins.map((pin) => {
                const scale =
                  mode === "Volume"
                    ? Math.sqrt(pin.count / maxCount)
                    : pin.avgConf / 100;
                const r = 2 + scale * 7;
                const color =
                  mode === "Volume"
                    ? "var(--color-accent)"
                    : confidenceColor(pin.avgConf);
                return (
                  <g key={pin.code}>
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={r}
                      fill={color}
                      opacity={0.18}
                    />
                    <circle
                      cx={pin.x}
                      cy={pin.y}
                      r={r}
                      fill="none"
                      stroke={color}
                      strokeOpacity={0.75}
                      strokeWidth={0.45}
                    />
                    <circle cx={pin.x} cy={pin.y} r={0.8} fill={color} />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
            Top origins
          </p>
          {loading ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-3.5 w-full" />
              ))}
            </div>
          ) : geo.isError ? (
            <p className="text-xs text-ink-3">Geolocation is unavailable right now.</p>
          ) : top.length === 0 ? (
            <p className="text-xs text-ink-3">No ip:port IOCs in range.</p>
          ) : (
            top.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-2 py-1 text-[11.5px]"
              >
                <span className="w-5 font-mono text-[9.5px] text-ink-3">
                  {c.code}
                </span>
                <span className="truncate">{c.name}</span>
                <span className="ml-auto h-[5px] w-11 shrink-0 overflow-hidden rounded-sm bg-surface-0">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.round((c.count / maxCount) * 100)}%`,
                      background:
                        mode === "Volume"
                          ? "var(--color-accent)"
                          : confidenceColor(c.avgConf),
                    }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-[9.5px] text-ink-3 tabular-nums">
                  {mode === "Volume" ? c.count : c.avgConf}
                </span>
              </div>
            ))
          )}

          <p className="mb-1 mt-4 font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
            {Math.max(days, 7)}-day activity
          </p>
          <svg viewBox="0 0 200 44" className="h-11 w-full" aria-hidden="true">
            <polyline
              fill="rgba(113,128,185,.14)"
              stroke="none"
              points={`0,44 ${sparkPoints} 200,44`}
            />
            <polyline
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              points={sparkPoints}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
