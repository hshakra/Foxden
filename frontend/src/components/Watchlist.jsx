import { useMemo } from "react";
import { Link } from "react-router-dom";
import { X, Shield, Tag } from "lucide-react";
import { useWatchlist, toggleWatch } from "../lib/watchlist";
import { table } from "../lib/table";
import { Group } from "./ui/Group";

// the entities this user tracks, with their activity in the current range
// renders nothing until something is watched
export function Watchlist({ iocs }) {
  const watchlist = useWatchlist();

  const counts = useMemo(() => {
    const byFamily = {};
    const byTag = {};
    for (const ioc of iocs) {
      byFamily[ioc.malware_printable] =
        (byFamily[ioc.malware_printable] || 0) + 1;
      for (const tag of ioc.tags ?? []) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }
    return { family: byFamily, tag: byTag };
  }, [iocs]);

  if (watchlist.length === 0) return null;

  return (
    <Group title="Watchlist" description="What you track, activity in range">
      <table className="w-full border-collapse lg:max-w-xl">
        <tbody>
          {watchlist.map((w) => {
            const count = counts[w.kind]?.[w.name] ?? 0;
            const to =
              w.kind === "family"
                ? `/family/${encodeURIComponent(w.name)}`
                : `/tag/${encodeURIComponent(w.name)}`;
            const Icon = w.kind === "family" ? Shield : Tag;
            return (
              <tr key={`${w.kind}:${w.name}`} className={table.row}>
                <td className={`${table.cell} max-w-0`}>
                  <Link
                    to={to}
                    className="flex items-center gap-2 font-medium text-accent-soft hover:underline"
                    title={w.name}
                  >
                    <Icon size={14} className="shrink-0 text-ink-low" />
                    <span className="truncate">{w.name}</span>
                  </Link>
                </td>
                <td className={`${table.cellNum} w-20`}>
                  <span className={count > 0 ? "" : "text-ink-low"}>
                    {count}
                  </span>
                </td>
                <td className={`${table.cell} w-10`}>
                  <button
                    type="button"
                    onClick={() => toggleWatch(w.kind, w.name)}
                    aria-label={`Remove ${w.name} from watchlist`}
                    className="grid place-content-center text-ink-low transition-colors duration-150 hover:text-conf-low"
                  >
                    <X size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Group>
  );
}
