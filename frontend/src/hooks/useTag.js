import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function useTag(name) {
  return useQuery({
    queryKey: ["tag", name],
    queryFn: () => api.tag(name),
    select: (data) => data.data ?? [],
    enabled: Boolean(name),
  });
}
