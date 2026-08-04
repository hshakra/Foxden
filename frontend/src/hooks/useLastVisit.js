import { useMemo, useState } from "react";
import { parseThreatFoxDate } from "../lib/time";

const KEY = "foxden-last-visit";

// how many iocs landed since the last time the app was opened
// the lazy initializer captures the previous visit once, then stamps fresh
export default function useLastVisit(iocs) {
  const [previousVisit] = useState(() => {
    const since = Number(localStorage.getItem(KEY)) || 0;
    localStorage.setItem(KEY, String(Date.now()));
    return since;
  });

  return useMemo(() => {
    if (!previousVisit || iocs.length === 0) return 0;
    let count = 0;
    for (const ioc of iocs) {
      const seen = parseThreatFoxDate(ioc.first_seen);
      if (seen && seen.getTime() > previousVisit) count += 1;
    }
    return count;
  }, [iocs, previousVisit]);
}
