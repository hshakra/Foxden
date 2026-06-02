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
import { TopFamilies } from "./TopFamilies";

export function ActivityChart({ iocs }) {
  const data = useMemo(() => buildDailyChart(iocs), [iocs]);
  return (
    <div>
      <div>
        <BarChart data={data} responsive width={"100%"} height={"100%"}>
          <CartesianGrid strokeDasharray={"3 3"} />
          <YAxis />
          <XAxis dataKey="date" />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" />
        </BarChart>
      </div>
      <div>
        <TopFamilies iocs={iocs} />
      </div>
    </div>
  );
}
