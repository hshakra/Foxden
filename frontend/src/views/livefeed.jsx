import useRecentIOC from "../hooks/useRecentIOCS.js";
import { ActivityChart } from "./ActivityChart.jsx";

export default function LiveFeed() {
  const recent = useRecentIOC();

  // guard
  if (recent.isLoading) return <div>Loading..</div>;
  if (recent.isError) return <div>Loading..</div>;

  return (
    <div>
      <ActivityChart iocs={recent.data.data} />
    </div>
  );
}
