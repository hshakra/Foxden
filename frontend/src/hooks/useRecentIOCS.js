import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useRange } from "../lib/range";

export default function useRecentIOCs() {
  const { days } = useRange();
  return useQuery({
    queryKey: ["recentIOCs", days],
    queryFn: () => api.recent(days),
    select: (data) => data.data ?? [],
  });
}
