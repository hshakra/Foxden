import { useMemo } from "react";
import { groupByIOCType } from "../utils/processor";
import { PieChart, Pie, Tooltip, Legend } from "recharts";

export function TypeBreakdown({ iocs }) {
  //count and percentage
  const data = useMemo(() => groupByIOCType(iocs), [iocs]);
  return (
    <div>
      <PieChart responsive width={"100%"} height={288}>
        <Pie
          data={data}
          dataKey="percentage"
          nameKey="type"
          innerRadius={"10%"}
          outerRadius={"100%"}
          cornerRadius={"5%"}
          paddingAngle={3}
          label={({ percentage }) => `${percentage}`}
        />
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
