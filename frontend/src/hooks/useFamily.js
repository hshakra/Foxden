import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

// family pages feel instant when the data is already warm,
// so keep it fresh for a while and prefetch on hover
const FAMILY_STALE = 5 * 60 * 1000;

export default function useFamily(name) {
  return useQuery({
    queryKey: ["family", name],
    queryFn: () => api.family(name),
    select: (data) => data.data ?? [],
    enabled: Boolean(name),
    staleTime: FAMILY_STALE,
  });
}

// call from onMouseEnter so the profile is loaded before the click lands
export function usePrefetchFamily() {
  const queryClient = useQueryClient();
  return (name) =>
    queryClient.prefetchQuery({
      queryKey: ["family", name],
      queryFn: () => api.family(name),
      staleTime: FAMILY_STALE,
    });
}
