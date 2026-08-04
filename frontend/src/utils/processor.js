const threatTypeMap = {
  botnet_cc: "Botnet Command & Control",
  payload_delivery: "Malware Distribution",
  payload: "Malware Payload",
  c2: "Command & Control",
};

export function rankFamilies(iocs) {
  const counts = {};

  //loop through all IOCS collecting IOCS
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].malware_printable in counts) {
      counts[iocs[a].malware_printable]++;
    } else {
      counts[iocs[a].malware_printable] = 1;
    }
  }

  //sort by descending count
  //slice top 10
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

export function buildDailyChart(iocs, days = 7) {
  let dailyIOCS = {};

  /*
  Group IOCS by date
  NOTE: iocs first seen looks like `"2026-05-21 21:58:26 UTC"`
  */
  for (let a = 0; a < iocs.length; a++) {
    const datePortion = iocs[a].first_seen.split(" ")[0];
    if (datePortion in dailyIOCS) {
      dailyIOCS[datePortion]++;
    } else {
      dailyIOCS[datePortion] = 1;
    }
  }

  // sorting and filling gaps across the selected range
  const finalDaily = [];
  for (let c = days - 1; c >= 0; c--) {
    const d = new Date();
    d.setDate(d.getDate() - c);
    const dateStr = d.toISOString().split("T")[0];
    finalDaily.push({
      date: dateStr,
      count: dailyIOCS[dateStr] || 0,
    });
  }

  return finalDaily;
}

export function groupByIOCType(iocs) {
  let iocsByType = {};

  // group by ioc_type, count
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].ioc_type in iocsByType) {
      iocsByType[iocs[a].ioc_type]++;
    } else {
      iocsByType[iocs[a].ioc_type] = 1;
    }
  }

  return Object.entries(iocsByType).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / iocs.length) * 100.0 * 10) / 10,
  }));
}

export function rankTags(iocs) {
  let tagsRank = {};

  //iocs
  for (let a = 0; a < iocs.length; a++) {
    // tags per ioc
    const tags = iocs[a].tags || [];
    for (let x = 0; x < tags.length; x++) {
      if (tags[x] in tagsRank) {
        tagsRank[tags[x]]++;
      } else {
        tagsRank[tags[x]] = 1;
      }
    }
  }

  return Object.entries(tagsRank)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}

export function sortRecentStream(iocs) {
  // full sorted stream, the feed virtualizes so no slice needed
  return [...iocs]
    .sort((a, b) => b.first_seen.localeCompare(a.first_seen))
    .map((ioc) => ({
      ...ioc,
      threat_type_label: threatTypeMap[ioc.threat_type] || ioc.threat_type,
    }));
}

// kpi numbers for the signal strip, each metric computed once
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

// stacked distribution for the signal strip, hash variants merge into one
export function typeDistribution(iocs) {
  const counts = {};
  for (let a = 0; a < iocs.length; a++) {
    const raw = iocs[a].ioc_type || "other";
    const type = raw.endsWith("_hash") ? "hash" : raw;
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

// hourly buckets for the 24h range, a daily chart is useless at that zoom
export function buildHourlyChart(iocs) {
  const hourly = {};
  for (let a = 0; a < iocs.length; a++) {
    // "2026-05-21 21:58:26 UTC" keyed down to the hour
    const hourPortion = iocs[a].first_seen.slice(0, 13);
    hourly[hourPortion] = (hourly[hourPortion] || 0) + 1;
  }

  const finalHourly = [];
  for (let c = 23; c >= 0; c--) {
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

// most used ports across ip:port IOCs
export function topPorts(iocs, limit = 6) {
  const counts = {};
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].ioc_type !== "ip:port") continue;
    const port = iocs[a].ioc.split(":")[1];
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
    const ip = iocs[a].ioc.split(":")[0];
    if (!seen.has(ip)) {
      seen.add(ip);
      ips.push(ip);
    }
  }
  return ips;
}

// per-IP confidence lookup so the map can aggregate either way
export function ipConfidenceMap(iocs) {
  const map = {};
  for (let a = 0; a < iocs.length; a++) {
    if (iocs[a].ioc_type !== "ip:port") continue;
    const ip = iocs[a].ioc.split(":")[0];
    map[ip] = Number(iocs[a].confidence_level) || 0;
  }
  return map;
}
