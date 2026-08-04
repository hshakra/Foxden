import { useMemo } from "react";
import { rankTags } from "../utils/processor";
import { TagChip } from "./TagChip";

export function TopTags({ iocs }) {
  const data = useMemo(() => rankTags(iocs), [iocs]);
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Trending tags</h4>
        <span className="font-mono text-[10px] text-ink-3">
          click a tag to explore it
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((i) => (
          <TagChip key={i.tag} tag={i.tag} count={i.count} />
        ))}
      </div>
    </div>
  );
}
