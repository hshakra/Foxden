import { useMemo } from "react";
import { groupByIOCType } from "../utils/processor";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const TYPE_COLORS = {
  "ip:port": "var(--color-t-ip)",
  domain: "var(--color-t-domain)",
  url: "var(--color-t-url)",
  md5_hash: "var(--color-t-hash)",
  sha256_hash: "var(--color-t-hash)",
};

export function TypeBreakdown({ iocs }) {
  const data = useMemo(() => groupByIOCType(iocs), [iocs]);
  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <h4 className="mb-3 text-[13px] font-semibold">IOC type breakdown</h4>
      <div className="flex items-center gap-6">
        <PieChart width={200} height={200}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              innerRadius="55%"
              outerRadius="95%"
              paddingAngle={3}
              cornerRadius={4}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={TYPE_COLORS[entry.type] ?? "var(--color-slate)"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-3)",
                border: "1px solid var(--color-line-2)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
        </PieChart>
        <ul className="flex flex-col gap-2 text-xs">
          {data.map((entry) => (
            <li key={entry.type} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{
                  background: TYPE_COLORS[entry.type] ?? "var(--color-slate)",
                }}
              />
              <span className="text-ink-2">{entry.type}</span>
              <span className="ml-2 font-mono text-[10px] text-ink tabular-nums">
                {entry.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
