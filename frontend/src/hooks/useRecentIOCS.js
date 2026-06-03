import { useQuery } from "@tanstack/react-query";

export default function useRecentIOC() {
  const query = useQuery({
    queryKey: ["recentIOCs"],
    queryFn: async () => {
      const resp = await fetch("/api/recent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      return resp.json();
    },
  });
  return query;
}
