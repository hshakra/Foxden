import { useMemo } from "react";
import { rankFamilies } from "../utils/processor";
import { FamilyCard } from "./FamilyCard";

// builds family panel
export function TopFamilies({ iocs }) {
  //returns name and count iocs
  const data = useMemo(() => rankFamilies(iocs), [iocs]);
  const max = data[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Top families</h4>
        <span className="font-mono text-[10px] text-ink-3">
          click → profile
        </span>
      </div>
      <div>
        {data.map((i, rank) => (
          <FamilyCard
            key={i.name}
            rank={rank + 1}
            name={i.name}
            count={i.count}
            max={max}
          />
        ))}
      </div>
    </div>
  );
}
