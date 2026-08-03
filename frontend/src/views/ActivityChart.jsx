import {
  BarChart,
  XAxis,
  YAxis,
  Bar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { buildDailyChart } from "../utils/processor";
import { useMemo } from "react";

export function ActivityChart({ iocs }) {
  const data = useMemo(() => buildDailyChart(iocs), [iocs]);
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <h4 className="mb-3 text-[13px] font-semibold">Daily activity</h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <YAxis
            width={36}
            tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface-2)" }}
            contentStyle={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-line-2)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="count"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
