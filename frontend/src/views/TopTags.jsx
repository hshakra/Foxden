import { useMemo } from "react";
import { rankTags } from "../utils/processor";
import { TagChip } from "./TagChip";

export function TopTags({ iocs }) {
  const data = useMemo(() => rankTags(iocs), [iocs]);
  return (
    <div>
      <span>Top Tags</span>
      <div>
        {data.map((i) => (
          <TagChip key={i.tag} tag={i.tag} count={i.count} />
        ))}
      </div>
    </div>
  );
}
