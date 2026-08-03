import useRecentIOC from "../hooks/useRecentIOCS.js";
import { ActivityChart } from "./ActivityChart.jsx";
import { TopFamilies } from "./TopFamilies.jsx";
import { TopTags } from "./TopTags.jsx";
import { TypeBreakdown } from "./TypeBreakdown.jsx";

export default function LiveFeed() {
  const recent = useRecentIOC();

  // guard
  if (recent.isLoading) return <div>Loading..</div>;
  if (recent.isError) return <div>Error: {recent.error}</div>;

  console.log(recent.data.data);

  return (
    <div>
      <ActivityChart iocs={recent.data.data} />
      <TypeBreakdown iocs={recent.data.data} />
      <TopFamilies iocs={recent.data.data} />
      <TopTags iocs={recent.data.data} />
    </div>
  );
}
