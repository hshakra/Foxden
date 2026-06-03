import { useMemo } from "react";
import { rankFamilies } from "../utils/processor";
import { FamilyCard } from "./FamilyCard";

// builds family panel
export function TopFamilies({ iocs }) {
  //returns name and count iocs
  const data = useMemo(() => rankFamilies(iocs), [iocs]);

  return (
    <div>
      <span style={{ fontWeight: "bold" }}>Top Families</span>
      <div>
        {data.map((i) => (
          <FamilyCard key={i.name} name={i.name} count={i.count} />
        ))}
      </div>
    </div>
  );
}
