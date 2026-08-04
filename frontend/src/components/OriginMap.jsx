import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import useGeo from "../hooks/useGeo";
import { NUM_TO_A2 } from "../lib/isoCodes";
import {
  extractIPs,
  ipConfidenceMap,
} from "../lib/processor";
import { CONF_COLORS } from "../lib/colors";
import { Skeleton } from "./states";
import { Group } from "./ui/Group";

// the overview hero, a world map shaded by where malicious ips sit
// toggles between volume (how many) and confidence (how certain)

// project the country shapes once, they never change
const MAP_W = 940;
const MAP_H = 460;
const countries = feature(worldData, worldData.objects.countries).features;
const projection = geoNaturalEarth1().fitSize([MAP_W, MAP_H], {
  type: "FeatureCollection",
  features: countries,
});
const pathFor = geoPath(projection);
const COUNTRY_PATHS = countries.map((c) => ({
  a2: NUM_TO_A2[Number(c.id)],
  name: c.properties.name,
  d: pathFor(c),
}));

const MODES = ["Volume", "Confidence"];

// high confidence stays quiet, the map should flag the doubtful regions
function confidenceColor(avg) {
  if (avg >= 75) return CONF_COLORS.quiet;
  if (avg >= 50) return CONF_COLORS.warn;
  return CONF_COLORS.bad;
}

export function OriginMap({ iocs }) {
  const [mode, setMode] = useState("Volume");
  const [hovered, setHovered] = useState(null);
  const ips = useMemo(() => extractIPs(iocs), [iocs]);
  const confByIp = useMemo(() => ipConfidenceMap(iocs), [iocs]);
  const geo = useGeo(ips);
  // a disabled query never resolves, so track the no-ips case ourselves
  const loading = ips.length > 0 && geo.isPending;


  // group by country with count and average confidence
  const byCountry = useMemo(() => {
    const map = {};
    for (const row of geo.data ?? []) {
      const entry = (map[row.countryCode] ??= {
        code: row.countryCode,
        name: row.country,
        count: 0,
        confSum: 0,
      });
      entry.count += 1;
      entry.confSum += confByIp[row.ip] ?? 0;
    }
    for (const entry of Object.values(map)) {
      entry.avgConf = Math.round(entry.confSum / entry.count);
    }
    return map;
  }, [geo.data, confByIp]);

  const origins = useMemo(
    () => Object.values(byCountry).sort((a, b) => b.count - a.count),
    [byCountry],
  );
  const top = origins.slice(0, 6);
  const maxCount = origins[0]?.count ?? 1;

  // shading strength, sqrt keeps mid sized countries visible next to the top one
  function fillFor(a2) {
    const entry = a2 ? byCountry[a2] : null;
    if (!entry) return { fill: "var(--color-overlay)", opacity: 0.55 };
    if (mode === "Volume") {
      const t = Math.sqrt(entry.count / maxCount);
      return { fill: "var(--color-accent)", opacity: 0.25 + t * 0.7 };
    }
    return { fill: confidenceColor(entry.avgConf), opacity: 0.6 };
  }

  const hoveredEntry = hovered ? byCountry[hovered.a2] : null;

  return (
    <Group
      title="Origins"
      description={
        mode === "Volume"
          ? "Malicious IPs by country, brighter means more IOCs"
          : "Average confidence of malicious IPs per country, 0 to 100"
      }
      actions={
        <div
          className="flex overflow-hidden rounded-md border border-line"
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
              className={`px-2.5 py-1 text-secondary transition-colors duration-150 ${
                mode === m
                  ? "bg-lifted text-ink"
                  : "text-ink-mid hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_215px]">
        <div className="relative overflow-hidden rounded-lg border border-line bg-raised">
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <>
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                className="mx-auto block max-h-[340px] w-full"
                aria-label="World map shaded by malicious IP origin"
                onMouseLeave={() => setHovered(null)}
              >
                {COUNTRY_PATHS.map((c) => {
                  const style = fillFor(c.a2);
                  return (
                    <path
                      key={`${c.a2}-${c.name}`}
                      d={c.d}
                      fill={style.fill}
                      fillOpacity={style.opacity}
                      stroke="var(--color-raised)"
                      strokeWidth={0.6}
                      onMouseEnter={() => setHovered(c)}
                    />
                  );
                })}
              </svg>
              {hovered && (
                <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-line-strong bg-overlay px-2.5 py-1.5 font-mono text-meta shadow-lg">
                  <b>{hoveredEntry?.name ?? hovered.name}</b>
                  {hoveredEntry ? (
                    <span className="text-ink-mid">
                      {" "}
                      {hoveredEntry.count} IOCs, avg conf {hoveredEntry.avgConf}
                    </span>
                  ) : (
                    <span className="text-ink-low"> no recorded IOCs</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <p className="mb-2 text-secondary font-medium text-ink-low">
            Top origins
          </p>
          {loading ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-3.5 w-full" />
              ))}
            </div>
          ) : geo.isError ? (
            <p className="text-secondary text-ink-low">
              Geolocation is unavailable right now.
            </p>
          ) : top.length === 0 ? (
            <p className="text-secondary text-ink-low">
              No ip:port IOCs in range.
            </p>
          ) : (
            top.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-2 py-1 text-secondary"
              >
                <span className="w-5 font-mono text-meta text-ink-low">
                  {c.code}
                </span>
                <span className="truncate">{c.name}</span>
                <span className="ml-auto h-[5px] w-11 shrink-0 overflow-hidden rounded-sm bg-bg">
                  <span
                    className="block h-full"
                    style={{
                      width: `${Math.round((c.count / maxCount) * 100)}%`,
                      background:
                        mode === "Volume"
                          ? "var(--color-line-strong)"
                          : confidenceColor(c.avgConf),
                    }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-meta text-ink-mid tabular-nums">
                  {mode === "Volume" ? c.count : c.avgConf}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </Group>
  );
}
