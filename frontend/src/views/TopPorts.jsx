import { useMemo } from "react";
import { topPorts } from "../utils/processor";
import { PORT_NAMES } from "../lib/ports";

// most used c2 ports across ip:port iocs in range
export function TopPorts({ iocs }) {
  const data = useMemo(() => topPorts(iocs), [iocs]);
  const max = data[0]?.count ?? 1;

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2 flex items-baseline gap-2.5">
        <h4 className="text-[14px] font-semibold">Top ports</h4>
        <span className="text-xs text-ink-2">Across ip:port IOCs</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-ink-3">No ip:port IOCs in range.</p>
      ) : (
        data.map((p, i) => (
          <div
            key={p.port}
            className="flex items-center gap-2.5 border-t border-line py-1.5 text-xs"
          >
            <span className="w-4 font-mono text-[10px] text-ink-3 tabular-nums">
              {i + 1}
            </span>
            <span className="font-mono text-[10.5px] text-t-ip tabular-nums">
              {p.port}
            </span>
            {PORT_NAMES[p.port] && (
              <span className="font-mono text-[9px] text-ink-3">
                {PORT_NAMES[p.port]}
              </span>
            )}
            <span className="ml-auto h-[5px] w-14 shrink-0 overflow-hidden rounded-sm bg-surface-0">
              <span
                className="block h-full bg-gradient-to-r from-accent to-accent-soft"
                style={{ width: `${Math.round((p.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-8 text-right font-mono text-[10px] text-ink-2 tabular-nums">
              {p.count}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
