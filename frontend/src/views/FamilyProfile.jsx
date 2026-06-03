import useRecentIOC from "../hooks/useRecentIOCS";
import { TopTags } from "./TopTags";
import { TypeBreakdown } from "./TypeBreakdown";

export function FamilyProfile() {
  const recent = useRecentIOC();

  if (recent.isLoading) return <div>Loading...</div>;
  if (recent.isError) return <div>Loading...</div>;

  return (
    <div>
      <div>
        <TypeBreakdown iocs={recent.data.data} />
      </div>
      <div>
        <TopTags iocs={recent.data.data} />
      </div>
    </div>
  );
}
