import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

const TAG_STALE = 5 * 60 * 1000;

export default function useTag(name) {
  return useQuery({
    queryKey: ["tag", name],
    queryFn: () => api.tag(name),
    select: (data) => data.data ?? [],
    enabled: Boolean(name),
    staleTime: TAG_STALE,
  });
}

// call from onMouseEnter so the tag page is loaded before the click lands
export function usePrefetchTag() {
  const queryClient = useQueryClient();
  return (name) =>
    queryClient.prefetchQuery({
      queryKey: ["tag", name],
      queryFn: () => api.tag(name),
      staleTime: TAG_STALE,
    });
}
