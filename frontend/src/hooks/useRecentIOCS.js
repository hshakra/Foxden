import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useRange } from "../lib/range";
import { parseThreatFoxDate } from "../lib/time";

// fetch double the window when threatfox allows it (max 7 days)
// the extra half becomes the comparison period for kpi deltas
export default function useRecentIOCs() {
  const { days } = useRange();
  const fetchDays = days * 2 <= 7 ? days * 2 : days;

  return useQuery({
    queryKey: ["recentIOCs", fetchDays, days],
    queryFn: () => api.recent(fetchDays),
    select: (data) => {
      const all = data.data ?? [];
      if (fetchDays === days) return { current: all, previous: [] };
      const cutoff = Date.now() - days * 86400000;
      const current = [];
      const previous = [];
      for (const ioc of all) {
        const seen = parseThreatFoxDate(ioc.first_seen);
        if (seen && seen.getTime() < cutoff) previous.push(ioc);
        else current.push(ioc);
      }
      return { current, previous };
    },
  });
}
