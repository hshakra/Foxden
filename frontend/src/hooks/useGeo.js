import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

// geolocate the feed's ip:port iocs
// the backend caches lookups so range changes are cheap
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
