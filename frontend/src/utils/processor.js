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

export function buildDailyChart(iocs) {
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

  // sorting and filling gaps
  const finalDaily = [];
  for (let c = 6; c >= 0; c--) {
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
    let fMapOfTags = iocs[a].tags?.flatMap((t) => t) || [];
    for (let x = 0; x < fMapOfTags.length; x++) {
      if (fMapOfTags[x] in tagsRank) {
        tagsRank[fMapOfTags[x]]++;
      } else {
        tagsRank[fMapOfTags[x]] = 1;
      }
    }
  }

  return Object.entries(tagsRank)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
}

export function sortRecentStream(iocs) {
  return [...iocs]
    .sort((a, b) => b.first_seen.localeCompare(a.first_seen))
    .slice(0, 20)
    .map((ioc) => ({
      ...ioc,
      threat_type_label: threatTypeMap[ioc.threat_type],
    }));
}
