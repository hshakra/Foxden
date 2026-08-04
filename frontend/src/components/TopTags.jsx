import { useMemo } from "react";
import { Link } from "react-router-dom";
import { rankTags } from "../lib/processor";
import { usePrefetchTag } from "../hooks/useTag";
import { Group } from "../components/ui/Group";

// ranked tag list for the overview, bars instead of a chip pile
export function TopTags({ iocs }) {
  const data = useMemo(() => rankTags(iocs), [iocs]);
  const prefetchTag = usePrefetchTag();
  const max = data[0]?.count ?? 1;

  return (
    <Group
      title="Trending tags"
      description="Most used in range"
      actions={
        <Link
          to="/tags"
          className="text-secondary text-accent-soft hover:underline"
        >
          All tags
        </Link>
      }
    >
      <div>
        {data.map((t, i) => (
          <Link
            key={t.tag}
            to={`/tag/${encodeURIComponent(t.tag)}`}
            onMouseEnter={() => prefetchTag(t.tag)}
            className="flex items-center gap-2.5 border-t border-line py-1.5 text-body transition-colors duration-150 hover:bg-raised"
          >
            <span className="w-4 font-mono text-meta text-ink-low tabular-nums">
              {i + 1}
            </span>
            <span
              className="truncate font-mono text-meta text-accent-soft"
              title={t.tag}
            >
              {t.tag}
            </span>
            <span className="ml-auto h-[5px] w-24 shrink-0 overflow-hidden rounded-sm bg-bg">
              <span
                className="block h-full bg-accent"
                style={{ width: `${Math.round((t.count / max) * 100)}%` }}
              />
            </span>
            <span className="w-9 text-right font-mono text-meta text-ink-mid tabular-nums">
              {t.count}
            </span>
          </Link>
        ))}
      </div>
    </Group>
  );
}
