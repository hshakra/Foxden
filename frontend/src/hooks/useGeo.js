import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

/*
  Geolocate the feed's ip:port IOCs. The backend caches lookups,
  so re-queries on range change are cheap.
*/
export default function useGeo(ips) {
  return useQuery({
    queryKey: ["geo", ips],
    queryFn: () => api.geo(ips),
    select: (data) => data.data ?? [],
    enabled: ips.length > 0,
    staleTime: 30 * 60 * 1000,
    refetchInterval: false,
  });
}
