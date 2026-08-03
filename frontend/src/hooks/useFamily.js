import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function useFamily(name) {
  return useQuery({
    queryKey: ["family", name],
    queryFn: () => api.family(name),
    select: (data) => data.data ?? [],
    enabled: Boolean(name),
  });
}
