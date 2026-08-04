import { useMemo } from "react";
import { topPorts } from "../lib/processor";
import { PORT_NAMES } from "../lib/ports";
import { Group } from "../components/ui/Group";

// most used c2 ports across ip:port iocs in range
export function TopPorts({ iocs }) {
  const data = useMemo(() => topPorts(iocs), [iocs]);
  const max = data[0]?.count ?? 1;

  return (
    <Group title="Top ports" description="Across ip:port IOCs">
      {data.length === 0 ? (
        <p className="text-secondary text-ink-low">
          No ip:port IOCs in range.
        </p>
      ) : (
        data.map((p, i) => (
          <div
            key={p.port}
            className="flex items-center gap-2.5 border-t border-line py-1.5 text-body"
          >
            <span className="w-4 font-mono text-meta text-ink-low tabular-nums">
              {i + 1}
            </span>
            <span className="font-mono text-meta tabular-nums">{p.port}</span>
            {PORT_NAMES[p.port] && (
              <span className="text-meta text-ink-low">
                {PORT_NAMES[p.port]}
              </span>
            )}
            <span className="ml-auto h-[5px] w-14 shrink-0 overflow-hidden rounded-sm bg-bg">
              <span
                className="block h-full bg-line-strong"
                style={{ width: `${Math.round((p.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-8 text-right font-mono text-meta text-ink-mid tabular-nums">
              {p.count}
            </span>
          </div>
        ))
      )}
    </Group>
  );
}
