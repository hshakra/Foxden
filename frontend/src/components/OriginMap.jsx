import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { Minus, Play, Plus, RotateCcw } from "lucide-react";
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
// zooms and pans, and motion only ever marks real feed events: the
// window replays once on load, refresh arrivals ping, then it rests

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

// the whole window compresses into this long a replay
const REPLAY_MS = 8000;
// how long one replay ring lives on screen
const RING_MS = 1100;

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

// "2026-05-21 21:58:26 UTC" from the feed to a millisecond timestamp
function parseSeen(s) {
  return Date.parse(s.replace(" UTC", "Z").replace(" ", "T"));
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OriginMap({ iocs, previous = [] }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("Volume");
  const [hovered, setHovered] = useState(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  // button zooms glide, wheel and drag stay direct
  const [glide, setGlide] = useState(false);
  const [pulses, setPulses] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [replayT, setReplayT] = useState(null);
  const [surgeOn, setSurgeOn] = useState(false);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const tipRef = useRef(null);
  const dragRef = useRef(null);
  const wasDragRef = useRef(false);
  const cursorRef = useRef({ x: 0, y: 0 });
  const prevIpsRef = useRef(null);
  const rafRef = useRef(null);
  const surgeTimerRef = useRef(null);
  const ips = useMemo(() => extractIPs(iocs), [iocs]);
  const confByIp = useMemo(() => ipConfidenceMap(iocs), [iocs]);
  const countByIp = useMemo(() => ipIocCounts(iocs), [iocs]);
  const geo = useGeo(ips);
  // the previous window's geography, for spotting which countries grew
  const prevIps = useMemo(() => extractIPs(previous), [previous]);
  const prevCountByIp = useMemo(() => ipIocCounts(previous), [previous]);
  const prevGeo = useGeo(prevIps);
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

  const prevByCountry = useMemo(() => {
    const map = {};
    for (const row of prevGeo.data ?? []) {
      map[row.countryCode] =
        (map[row.countryCode] || 0) + (prevCountByIp[row.ip] ?? 0);
    }
    return map;
  }, [prevGeo.data, prevCountByIp]);

  // the countries that grew the most against the previous window,
  // capped so the one time glow stays a highlight and not a light show
  const surged = useMemo(() => {
    if (previous.length === 0 || !prevGeo.data) return [];
    return origins
      .map((c) => ({ code: c.code, growth: c.count - (prevByCountry[c.code] ?? 0) }))
      .filter((c) => c.growth > 0)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 8)
      .map((c) => c.code);
  }, [origins, prevByCountry, previous.length, prevGeo.data]);

  // every geolocated server as a timed event, earliest sighting first,
  // this is what the replay and the arrival ticker are built from
  const events = useMemo(() => {
    const rows = geo.data ?? [];
    if (rows.length === 0) return [];
    const meta = {};
    for (const ioc of iocs) {
      if (ioc.ioc_type !== "ip:port") continue;
      const ip = ioc.ioc.split(":")[0];
      const t = parseSeen(ioc.first_seen);
      if (!Number.isFinite(t)) continue;
      const m = meta[ip];
      if (!m || t < m.t) meta[ip] = { t, fam: ioc.malware_printable };
    }
    const evs = [];
    for (const row of rows) {
      const m = meta[row.ip];
      if (!m || (!row.lat && !row.lon)) continue;
      const p = projection([row.lon, row.lat]);
      if (!p) continue;
      evs.push({
        ip: row.ip,
        x: p[0],
        y: p[1],
        t: m.t,
        fam: m.fam,
        code: row.countryCode,
        name: row.country,
        count: countByIp[row.ip] ?? 1,
        conf: confByIp[row.ip] ?? 0,
      });
    }
    evs.sort((a, b) => a.t - b.t);
    return evs;
  }, [geo.data, iocs, countByIp, confByIp]);

  // real timestamps squeezed onto the replay clock
  const timeline = useMemo(() => {
    if (events.length < 2) return [];
    const t0 = events[0].t;
    const span = events[events.length - 1].t - t0 || 1;
    return events.map((ev) => ({
      ...ev,
      at: ((ev.t - t0) / span) * REPLAY_MS,
    }));
  }, [events]);

  function fireSurge() {
    clearTimeout(surgeTimerRef.current);
    setSurgeOn(true);
    surgeTimerRef.current = setTimeout(() => setSurgeOn(false), 2600);
  }

  // play the window from its first arrival to now, then settle and
  // hand off to the surge glow, quantized so renders stay coarse
  function startReplay() {
    if (timeline.length === 0 || reducedMotion()) {
      fireSurge();
      return;
    }
    cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();
    let lastQ = -1;
    const tick = (now) => {
      const t = now - t0;
      if (t >= REPLAY_MS + RING_MS) {
        setReplayT(null);
        fireSurge();
        return;
      }
      const q = Math.floor(t / 140) * 140;
      if (q !== lastQ) {
        lastQ = q;
        setReplayT(q);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(surgeTimerRef.current);
    },
    [],
  );

  // one effect decides what a data change means: a new scene replays,
  // a refresh pings only what actually arrived
  useEffect(() => {
    const rows = geo.data ?? [];
    if (rows.length === 0) return;
    const prev = prevIpsRef.current;
    prevIpsRef.current = new Set(rows.map((r) => r.ip));
    const fresh = prev ? rows.filter((r) => !prev.has(r.ip)) : rows;
    if (!prev || fresh.length > 50) {
      startReplay();
      return;
    }
    if (fresh.length === 0) return;
    const freshEvents = events.filter((ev) =>
      fresh.some((r) => r.ip === ev.ip),
    );
    const fams = [...new Set(freshEvents.map((ev) => ev.fam).filter(Boolean))];
    setPulses(freshEvents);
    setTicker({
      count: fresh.length,
      families: fams.slice(0, 2).join(", "),
      at: Date.now(),
    });
    const id = setTimeout(() => setPulses([]), 5200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.data]);

  // during the replay the shading is the cumulative state of the
  // window at that instant, brightness stays on the final scale
  const shading = useMemo(() => {
    if (replayT === null) return byCountry;
    const map = {};
    for (const ev of timeline) {
      if (ev.at > replayT) break;
      const entry = (map[ev.code] ??= {
        code: ev.code,
        name: ev.name,
        count: 0,
        ips: 0,
        confSum: 0,
      });
      entry.count += ev.count;
      entry.ips += 1;
      entry.confSum += ev.conf;
    }
    for (const entry of Object.values(map)) {
      entry.avgConf = Math.round(entry.confSum / entry.ips);
    }
    return map;
  }, [replayT, timeline, byCountry]);

  // shading strength, sqrt keeps mid sized countries visible next to the top one
  // a small floor keeps single ioc countries above the no data shade
  function fillFor(a2) {
    const entry = a2 ? shading[a2] : null;
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

  function zoomBy(factor, cx = MAP_W / 2, cy = MAP_H / 2, smooth = false) {
    setGlide(smooth);
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
      setGlide(false);
      // capture only once a real drag starts, capturing on every press
      // retargets the click event away from the country paths
      svgRef.current.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    // freeze this step's delta and re-anchor before queueing the state
    // update, the updater runs later and must not re-read the anchor,
    // and anchoring per step keeps the map tracking the cursor exactly
    const dx = p.x - d.px;
    const dy = p.y - d.py;
    d.px = p.x;
    d.py = p.y;
    setView((v) => clampView({ k: v.k, x: v.x + dx, y: v.y + dy }));
  }

  function onPointerUp(e) {
    wasDragRef.current = dragRef.current?.moved ?? false;
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId))
      svgRef.current.releasePointerCapture(e.pointerId);
  }

  // the tooltip trails the cursor, moved directly so the svg with its
  // hundreds of nodes does not re-render on every mouse move
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
  const hoveredDelta =
    hoveredEntry && previous.length > 0 && prevGeo.data
      ? hoveredEntry.count - (prevByCountry[hovered.a2] ?? 0)
      : null;
  const { k, x, y } = view;
  const replayRings =
    replayT === null
      ? []
      : timeline.filter((ev) => ev.at <= replayT && ev.at > replayT - RING_MS);

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
                <g
                  style={{
                    transform: `translate(${x}px, ${y}px) scale(${k})`,
                    transformOrigin: "0 0",
                    transition: glide ? "transform 300ms ease" : undefined,
                  }}
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
                  {replayRings.map((ev) => (
                    <circle
                      key={ev.ip}
                      className="map-flash"
                      cx={ev.x}
                      cy={ev.y}
                      r={(2.5 + Math.min(3, ev.count)) / k}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.2 / k}
                      pointerEvents="none"
                    />
                  ))}
                  {pulses.map((ev) => (
                    <circle
                      key={ev.ip}
                      className="map-pulse"
                      cx={ev.x}
                      cy={ev.y}
                      r={5 / k}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.2 / k}
                      pointerEvents="none"
                    />
                  ))}
                  {surgeOn &&
                    surged.map((code) => {
                      const c = COUNTRY_PATHS.find((p) => p.a2 === code);
                      return c ? (
                        <path
                          key={`surge-${code}`}
                          className="map-surge"
                          d={c.d}
                          fill="none"
                          stroke="var(--color-accent)"
                          strokeWidth={1.4 / k}
                          pointerEvents="none"
                        />
                      ) : null;
                    })}
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
                  onClick={() => zoomBy(1.5, MAP_W / 2, MAP_H / 2, true)}
                  className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  aria-label="Zoom out"
                  title="Zoom out"
                  onClick={() => zoomBy(1 / 1.5, MAP_W / 2, MAP_H / 2, true)}
                  className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                >
                  <Minus size={13} />
                </button>
                {timeline.length > 1 && (
                  <button
                    type="button"
                    aria-label="Replay the window"
                    title="Replay how this window filled in"
                    onClick={startReplay}
                    className="rounded-md border border-line bg-raised/90 p-1 text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
                  >
                    <Play size={13} />
                  </button>
                )}
                {k > 1 && (
                  <button
                    type="button"
                    aria-label="Reset view"
                    title="Back to the whole world"
                    onClick={() => {
                      setGlide(true);
                      setView({ k: 1, x: 0, y: 0 });
                    }}
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
              {ticker && (
                <Link
                  key={ticker.at}
                  to="/iocs"
                  title="See them in the IOC browser"
                  className="reveal absolute bottom-2.5 right-3 rounded-md border border-line bg-raised/90 px-2.5 py-1.5 font-mono text-meta text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
                >
                  +{ticker.count} server{ticker.count === 1 ? "" : "s"} this
                  refresh
                  {ticker.families ? ` · ${ticker.families}` : ""}
                </Link>
              )}
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
                      {hoveredDelta !== null && (
                        <span
                          className={
                            hoveredDelta > 0 ? "text-conf-low" : "text-ink-low"
                          }
                        >
                          {" "}
                          {hoveredDelta >= 0 ? "+" : ""}
                          {hoveredDelta} vs previous
                        </span>
                      )}
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
