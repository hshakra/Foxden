import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import useGeo from "../hooks/useGeo";
import { NUM_TO_A2 } from "../lib/isoCodes";
import {
  extractIPs,
  ipConfidenceMap,
} from "../lib/processor";
import { CONF_COLORS, heatColor, heatGradient } from "../lib/colors";
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

// three discrete bands, softened so a map of mostly high confidence
// stays quiet and the doubtful regions are what stands out
const CONF_BANDS = [
  { min: 75, label: "75 and up", fill: CONF_COLORS.quiet, opacity: 0.35 },
  { min: 50, label: "50 to 74", fill: CONF_COLORS.warn, opacity: 0.6 },
  { min: 0, label: "under 50", fill: CONF_COLORS.bad, opacity: 0.75 },
];

function confidenceBand(avg) {
  return CONF_BANDS.find((b) => avg >= b.min) ?? CONF_BANDS[2];
}

export function OriginMap({ iocs }) {
  const navigate = useNavigate();
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
  // a small floor keeps single ioc countries above the no data shade
  function fillFor(a2) {
    const entry = a2 ? byCountry[a2] : null;
    if (!entry) return { fill: "var(--color-overlay)", opacity: 0.55 };
    if (mode === "Volume") {
      const t = Math.sqrt(entry.count / maxCount);
      return { fill: heatColor(0.12 + t * 0.88), opacity: 1 };
    }
    const band = confidenceBand(entry.avgConf);
    return { fill: band.fill, opacity: band.opacity };
  }

  const hoveredEntry = hovered ? byCountry[hovered.a2] : null;

  return (
    <Group
      title="Origins"
      description={
        mode === "Volume"
          ? "Malicious IPs by country, brighter means more IOCs, click a country to browse"
          : "Average confidence of malicious IPs per country in three bands, click a country to browse"
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
                  const hasData = Boolean(c.a2 && byCountry[c.a2]);
                  return (
                    <path
                      key={`${c.a2}-${c.name}`}
                      d={c.d}
                      fill={style.fill}
                      fillOpacity={style.opacity}
                      stroke="var(--color-raised)"
                      strokeWidth={0.6}
                      className={hasData ? "cursor-pointer" : undefined}
                      onMouseEnter={() => setHovered(c)}
                      onClick={() => {
                        if (hasData) navigate(`/iocs?country=${c.a2}`);
                      }}
                    />
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-2 rounded-md border border-line bg-raised/90 px-2.5 py-1.5 text-meta text-ink-low">
                {mode === "Volume" ? (
                  <>
                    <span>fewer</span>
                    <span
                      className="h-[6px] w-24 rounded-sm"
                      style={{ background: heatGradient() }}
                    />
                    <span>more IOCs</span>
                  </>
                ) : (
                  CONF_BANDS.map((b) => (
                    <span key={b.label} className="flex items-center gap-1.5">
                      <span
                        className="h-[7px] w-[7px] rounded-[2px]"
                        style={{ background: b.fill, opacity: b.opacity }}
                      />
                      {b.label}
                    </span>
                  ))
                )}
              </div>
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
              <Link
                key={c.code}
                to={`/iocs?country=${c.code}`}
                title={`Browse IOCs from ${c.name}`}
                className="flex items-center gap-2 rounded-md py-1 text-secondary transition-colors duration-150 hover:bg-lifted/60"
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
                          : confidenceBand(c.avgConf).fill,
                    }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-meta text-ink-mid tabular-nums">
                  {mode === "Volume" ? c.count : c.avgConf}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </Group>
  );
}
