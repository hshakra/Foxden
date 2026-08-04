// pure data crunching over the ioc feed, shared by every view
// all date math is utc because threatfox timestamps are utc

// hash subtypes collapse into one bucket everywhere
export function normalizeType(iocType) {
  const raw = iocType || "other";
  return raw.endsWith("_hash") ? "hash" : raw;
}

// name to list of iocs, the grouping half the app is built on
export function groupByFamily(iocs) {
  const byFamily = {};
  for (const ioc of iocs) {
    (byFamily[ioc.malware_printable] ??= []).push(ioc);
  }
  return byFamily;
}

// per family type mix as percentage parts for the mix bars
export function familyTypeMix(list) {
  const counts = {};
  for (const ioc of list) {
    const t = normalizeType(ioc.ioc_type);
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts).map(([type, count]) => ({
    type,
    pct: Math.round((count / list.length) * 100),
  }));
}

// midnight utc of the current day
function utcToday() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// daily buckets for the selected window
// a rolling n day window spans n plus one calendar days, so the oldest
// partial day gets its own bucket instead of dropping its iocs
export function buildDailyChart(iocs, days = 7) {
  const dailyIOCS = {};
  for (let a = 0; a < iocs.length; a++) {
    // first_seen looks like "2026-05-21 21:58:26 UTC"
    const datePortion = iocs[a].first_seen.split(" ")[0];
    dailyIOCS[datePortion] = (dailyIOCS[datePortion] || 0) + 1;
  }

  const finalDaily = [];
  const base = utcToday();
  for (let c = days; c >= 0; c--) {
    const dateStr = new Date(base - c * 86400000).toISOString().split("T")[0];
    finalDaily.push({ date: dateStr, count: dailyIOCS[dateStr] || 0 });
  }
  return finalDaily;
}

// hourly buckets for the 24h range, a daily chart is useless at that zoom
// 25 buckets so the oldest partial hour is not dropped, labels are utc
export function buildHourlyChart(iocs) {
  const hourly = {};
  for (let a = 0; a < iocs.length; a++) {
    // "2026-05-21 21:58:26 UTC" keyed down to the hour
    const hourPortion = iocs[a].first_seen.slice(0, 13);
    hourly[hourPortion] = (hourly[hourPortion] || 0) + 1;
  }

  const finalHourly = [];
  for (let c = 24; c >= 0; c--) {
    const d = new Date(Date.now() - c * 3600000);
    const key = d.toISOString().slice(0, 13).replace("T", " ");
    finalHourly.push({
      date: `${key.slice(11)}:00`,
      count: hourly[key] || 0,
    });
  }
  return finalHourly;
}

// one series for any range, hourly at 24h and daily above it
export function buildActivitySeries(iocs, days) {
  return days === 1 ? buildHourlyChart(iocs) : buildDailyChart(iocs, days);
}

export function rankTags(iocs) {
  const tagsRank = {};
  for (let a = 0; a < iocs.length; a++) {
    const tags = iocs[a].tags || [];
    for (let x = 0; x < tags.length; x++) {
      tagsRank[tags[x]] = (tagsRank[tags[x]] || 0) + 1;
    }
  }
  return Object.entries(tagsRank)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}

// full sorted stream, newest first, the feed virtualizes so no slice needed
export function sortRecentStream(iocs) {
  return [...iocs].sort((a, b) => b.first_seen.localeCompare(a.first_seen));
}

// kpi numbers for the overview tiles, each metric computed once
export function computeKpis(iocs) {
  const families = new Set();
  const tags = new Set();
  let confidenceSum = 0;

  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].malware_printable) families.add(iocs[a].malware_printable);
    const iocTags = iocs[a].tags || [];
    for (let t = 0; t < iocTags.length; t++) tags.add(iocTags[t]);
    confidenceSum += Number(iocs[a].confidence_level) || 0;
  }

  return {
    total: iocs.length,
    familyCount: families.size,
    tagCount: tags.size,
    avgConfidence: iocs.length ? Math.round(confidenceSum / iocs.length) : 0,
  };
}

// busiest family in range, the fallback when no comparison window exists
export function topFamilyName(iocs) {
  const counts = {};
  for (const ioc of iocs) {
    counts[ioc.malware_printable] = (counts[ioc.malware_printable] || 0) + 1;
  }
  let best = "";
  for (const name in counts) {
    if (!best || counts[name] > counts[best]) best = name;
  }
  return best;
}

// tags that appear exactly once, a rough noise measure
export function countSingleUseTags(iocs) {
  const counts = {};
  for (const ioc of iocs) {
    for (const tag of ioc.tags ?? []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  let n = 0;
  for (const tag in counts) if (counts[tag] === 1) n += 1;
  return n;
}

// stacked distribution for the composition bars
export function typeDistribution(iocs) {
  const counts = {};
  for (let a = 0; a < iocs.length; a++) {
    const type = normalizeType(iocs[a].ioc_type);
    counts[type] = (counts[type] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      pct: Math.round((count / iocs.length) * 1000) / 10,
    }));
}

// what the indicators are used for, keyed by threatfox threat_type
export function threatDistribution(iocs) {
  const counts = {};
  for (let a = 0; a < iocs.length; a++) {
    const type = iocs[a].threat_type || "other";
    counts[type] = (counts[type] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      pct: Math.round((count / iocs.length) * 1000) / 10,
    }));
}

// ip:port values split on the last colon so ipv6 stays intact
export function splitIpPort(value) {
  const at = value.lastIndexOf(":");
  if (at < 0) return [value, ""];
  return [value.slice(0, at), value.slice(at + 1)];
}

// most used ports across ip:port IOCs
export function topPorts(iocs, limit = 6) {
  const counts = {};
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].ioc_type !== "ip:port") continue;
    const port = splitIpPort(iocs[a].ioc)[1];
    if (port) counts[port] = (counts[port] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([port, count]) => ({ port, count }));
}

// families active now that were not in the previous window
export function newFamilies(current, previous) {
  const before = new Set();
  for (let a = 0; a < previous.length; a++) {
    before.add(previous[a].malware_printable);
  }
  const fresh = new Set();
  for (let a = 0; a < current.length; a++) {
    if (!before.has(current[a].malware_printable)) {
      fresh.add(current[a].malware_printable);
    }
  }
  return fresh.size;
}

// unique IPs from ip:port IOCs, for the origin map
export function extractIPs(iocs, limit = 500) {
  const seen = new Set();
  const ips = [];
  for (let a = 0; a < iocs.length && ips.length < limit; a++) {
    if (iocs[a].ioc_type !== "ip:port") continue;
    const ip = splitIpPort(iocs[a].ioc)[0];
    if (!seen.has(ip)) {
      seen.add(ip);
      ips.push(ip);
    }
  }
  return ips;
}

// per-IP confidence for the map, keep the strongest signal per address
export function ipConfidenceMap(iocs) {
  const map = {};
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].ioc_type !== "ip:port") continue;
    const ip = splitIpPort(iocs[a].ioc)[0];
    const conf = Number(iocs[a].confidence_level) || 0;
    if (conf > (map[ip] ?? -1)) map[ip] = conf;
  }
  return map;
}
