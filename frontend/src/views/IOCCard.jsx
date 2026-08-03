import { timeAgo } from "../lib/time";
import { confidenceInfo } from "../lib/confidence";

/*
  One IOC as a feed row. Fully rebuilt in Phase 2 —
  this valid stub keeps the module compiling until then.
*/
export function IOCCard({ ioc }) {
  const conf = confidenceInfo(ioc.confidence_level);
  return (
    <div className="flex items-center gap-3 border-b border-line py-2 text-xs">
      <span className="font-mono">{ioc.ioc}</span>
      <span className="text-accent-soft">{ioc.malware_printable}</span>
      <span className="ml-auto font-mono text-ink-3">
        {conf.value} · {conf.label} · {timeAgo(ioc.first_seen)}
      </span>
    </div>
  );
}
