import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Minus, Plus, RotateCcw } from "lucide-react";
import worldData from "world-atlas/countries-110m.json";
import useGeo from "../hooks/useGeo";
import { NUM_TO_A2 } from "../lib/isoCodes";
import {
  extractIPs,
  ipConfidenceMap,
  ipIocCounts,
} from "../lib/processor";
import { CONF_COLORS, heatColor, heatGradient } from "../lib/colors";
import { Skeleton } from "./states";
import { Group } from "./ui/Group";

// the overview hero, a world map shaded by where malicious ips sit
// toggles between volume (how many) and confidence (how certain)
// zooms and pans, and every geolocated server is a dot on the land

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

// past this the 110m shapes get visibly blocky
const MAX_ZOOM = 8;

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

// keep the map filling the frame at any zoom, no gaps past the edges
function clampView({ k, x, y }) {
  return {
    k,
    x: Math.min(0, Math.max(MAP_W * (1 - k), x)),
    y: Math.min(0, Math.max(MAP_H * (1 - k), y)),
  };
}

// one marker per occupied map cell, thousands of ips share city
// coordinates so collapsing them keeps the svg light, the count per
// cell survives so busy locations can draw bigger than lone servers
function dotsFor(rows) {
  const cells = new Map();
  for (const row of rows) {
    if (!row.lat && !row.lon) continue;
    const p = projection([row.lon, row.lat]);
    if (!p) continue;
    const key = `${Math.round(p[0])},${Math.round(p[1])}`;
    const cell = cells.get(key);
    if (cell) cell.n += 1;
    else cells.set(key, { key, x: p[0], y: p[1], n: 1 });
  }
  return [...cells.values()];
}

export function OriginMap({ iocs }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("Volume");
  const [hovered, setHovered] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [pulses, setPulses] = useState([]);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const tipRef = useRef(null);
  const dragRef = useRef(null);
  const wasDragRef = useRef(false);
  const cursorRef = useRef({ x: 0, y: 0 });
  const prevIpsRef = useRef(null);
  const ips = useMemo(() => extractIPs(iocs), [iocs]);
  const confByIp = useMemo(() => ipConfidenceMap(iocs), [iocs]);
  const countByIp = useMemo(() => ipIocCounts(iocs), [iocs]);
  const geo = useGeo(ips);
  // a disabled query never resolves, so track the no-ips case ourselves
  const loading = ips.length > 0 && geo.isPending;

  // group by country, counting iocs so the numbers match the browse page,
  // confidence still averages per ip so one busy address cannot skew it
  const byCountry = useMemo(() => {
    const map = {};
    for (const row of geo.data ?? []) {
      const entry = (map[row.countryCode] ??= {
        code: row.countryCode,
        name: row.country,
        count: 0,
        ips: 0,
        confSum: 0,
      });
      entry.count += countByIp[row.ip] ?? 0;
      entry.ips += 1;
      entry.confSum += confByIp[row.ip] ?? 0;
    }
    for (const entry of Object.values(map)) {
      entry.avgConf = Math.round(entry.confSum / entry.ips);
    }
    return map;
  }, [geo.data, confByIp, countByIp]);

  const origins = useMemo(
    () => Object.values(byCountry).sort((a, b) => b.count - a.count),
    [byCountry],
  );
  const top = origins.slice(0, 6);
  const maxCount = origins[0]?.count ?? 1;

  const dots = useMemo(() => dotsFor(geo.data ?? []), [geo.data]);

  // ping the locations that arrived since the last refresh, the first
  // load and range changes replace everything so those stay silent
  useEffect(() => {
    const rows = geo.data ?? [];
    if (rows.length === 0) return;
    const prev = prevIpsRef.current;
    prevIpsRef.current = new Set(rows.map((r) => r.ip));
    if (!prev) return;
    const fresh = rows.filter((r) => !prev.has(r.ip));
    if (fresh.length === 0 || fresh.length > 50) return;
    setPulses(dotsFor(fresh));
    const id = setTimeout(() => setPulses([]), 5200);
    return () => clearTimeout(id);
  }, [geo.data]);

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

  // client coordinates to map units, the ctm covers viewbox letterboxing
  function toMap(e) {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  }

  function zoomBy(factor, cx = MAP_W / 2, cy = MAP_H / 2) {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor));
      return clampView({
        k,
        x: cx - (k / v.k) * (cx - v.x),
        y: cy - (k / v.k) * (cy - v.y),
      });
    });
  }

  // wheel zoom only with ctrl or cmd held, which is also what trackpad
  // pinch sends, so plain scrolling past the map keeps scrolling the page
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = toMap(e);
      if (p) zoomBy(Math.exp(-e.deltaY * 0.01), p.x, p.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  function onPointerDown(e) {
    if (e.button !== 0) return;
    const p = toMap(e);
    if (!p) return;
    dragRef.current = { px: p.x, py: p.y, moved: false };
    wasDragRef.current = false;
  }

  function onPointerMove(e) {
    positionTip(e);
    const d = dragRef.current;
    if (!d) return;
    const p = toMap(e);
    if (!p) return;
    if (!d.moved && Math.abs(p.x - d.px) + Math.abs(p.y - d.py) > 2) {
      d.moved = true;
      // capture only once a real drag starts, capturing on every press
      // retargets the click event away from the country paths
      svgRef.current.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    setView((v) =>
      clampView({ k: v.k, x: v.x + (p.x - d.px), y: v.y + (p.y - d.py) }),
    );
  }

  function onPointerUp(e) {
    wasDragRef.current = dragRef.current?.moved ?? false;
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId);
  }

  // the tooltip trails the cursor, moved directly so the svg with its
  // thousands of nodes does not re-render on every mouse move
  function positionTip(e) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const x = Math.min(e.clientX - r.left + 14, r.width - 210);
    const y = Math.min(e.clientY - r.top + 14, r.height - 44);
    cursorRef.current = { x, y };
    if (tipRef.current)
      tipRef.current.style.transform = `translate(${x}px, ${y}px)`;
  }

  const hoveredEntry = hovered ? byCountry[hovered.a2] : null;
  const { k, x, y } = view;

  return (
    <Group
      title="Origins"
      description={
        mode === "Volume"
          ? "Malicious IPs by country, brighter means more IOCs and every dot is a server, click a country to browse"
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
        <div
          ref={wrapRef}
          className="relative overflow-hidden rounded-lg border border-line bg-raised"
        >
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                className={`mx-auto block max-h-[340px] w-full ${k > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ touchAction: k > 1 ? "none" : "pan-y" }}
                aria-label="World map shaded by malicious IP origin"
                onMouseLeave={() => setHovered(null)}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <g transform={`translate(${x} ${y}) scale(${k})`}>
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
                        strokeWidth={0.6 / k}
                        className={`map-country${hasData ? " cursor-pointer" : ""}`}
                        onMouseEnter={() => setHovered(c)}
                        onClick={() => {
                          if (hasData && !wasDragRef.current)
                            navigate(`/iocs?country=${c.a2}`);
                        }}
                      />
                    );
                  })}
                  {dots.map((d, i) => (
                    <circle
                      key={d.key}
                      className="map-dot"
                      cx={d.x}
                      cy={d.y}
                      r={1.5 / Math.sqrt(k)}
                      fill="var(--color-accent-soft)"
                      fillOpacity={0.75}
                      stroke="rgb(0 0 0 / 0.5)"
                      strokeWidth={0.3 / k}
                      pointerEvents="none"
                      style={{ animationDelay: `${(i % 50) * 14}ms` }}
                    />
                  ))}
                  {pulses.map((p) => (
                    <circle
                      key={p.key}
                      className="map-pulse"
                      cx={p.x}
                      cy={p.y}
                      r={5 / k}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.2 / k}
                      pointerEvents="none"
                    />
                  ))}
                  {hovered && (
                    <path
                      d={hovered.d}
                      fill="none"
                      stroke={
                        hoveredEntry
                          ? "var(--color-accent)"
                          : "var(--color-line-strong)"
                      }
                      strokeWidth={1.1 / k}
                      pointerEvents="none"
                    />
                  )}
                </g>
              </svg>
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                <button
                  type="button"
                  aria-label="Zoom in"
                  title="Zoom in, or pinch the map"
                  onClick={() => zoomBy(1.5)}
                  className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => zoomBy(1 / 1.5)}
                  className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                >
                  <Minus size={13} />
                </button>
                {k > 1 && (
                  <button
                    type="button"
                    aria-label="Reset view"
                    title="Back to the whole world"
                    onClick={() => setView({ k: 1, x: 0, y: 0 })}
                    className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
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
                <div
                  ref={tipRef}
                  className="pointer-events-none absolute left-0 top-0 will-change-transform rounded-lg border border-line-strong bg-overlay px-2.5 py-1.5 font-mono text-meta shadow-lg"
                  style={{
                    transform: `translate(${cursorRef.current.x}px, ${cursorRef.current.y}px)`,
                  }}
                >
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
