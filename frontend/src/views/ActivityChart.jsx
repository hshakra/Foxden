import {
  BarChart,
  XAxis,
  YAxis,
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { buildDailyChart } from "../utils/processor";
import { useMemo } from "react";

export function ActivityChart({ iocs }) {
  const data = useMemo(() => buildDailyChart(iocs), [iocs]);
  return (
    <div>
      <div>
        <BarChart data={data} responsive width={"100%"} height={288}>
          <CartesianGrid strokeDasharray={"3 3"} />
          <YAxis />
          <XAxis dataKey="date" />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" />
        </BarChart>
      </div>
    </div>
  );
}
