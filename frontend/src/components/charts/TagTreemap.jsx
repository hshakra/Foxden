import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { heatColor } from "../../lib/colors";

// the tags page hero, every big tag as a tile sized by how often it is used
// click a tile to open the tag
const WIDTH = 1000;
const HEIGHT = 260;
const MAX_TILES = 24;

export function TagTreemap({ rows }) {
  const navigate = useNavigate();

  const tiles = useMemo(() => {
    const top = [...rows].sort((a, b) => b.count - a.count).slice(0, MAX_TILES);
    if (top.length === 0) return [];
    const root = hierarchy({ children: top })
      .sum((d) => d.count ?? 0)
      .sort((a, b) => b.value - a.value);
    treemap()
      .tile(treemapSquarify)
      .size([WIDTH, HEIGHT])
      .paddingInner(3)(root);
    const max = top[0].count;
    return root.leaves().map((leaf) => ({
      tag: leaf.data.tag,
      count: leaf.data.count,
      x: leaf.x0,
      y: leaf.y0,
      w: leaf.x1 - leaf.x0,
      h: leaf.y1 - leaf.y0,
      // brighter glaucous for heavier tags
      t: Math.sqrt(leaf.data.count / max),
    }));
  }, [rows]);

  if (tiles.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h4 className="text-[13px] font-semibold">Tag landscape</h4>
        <span className="font-mono text-[10px] text-ink-3">
          top {tiles.length} tags sized by IOC count, click to explore
        </span>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
      >
        {tiles.map((t) => (
          <button
            key={t.tag}
            type="button"
            onClick={() => navigate(`/tag/${encodeURIComponent(t.tag)}`)}
            title={`${t.tag}, ${t.count.toLocaleString()} IOCs`}
            className="group absolute overflow-hidden rounded-[4px] text-left transition-transform hover:z-10 hover:scale-[1.03]"
            style={{
              left: `${(t.x / WIDTH) * 100}%`,
              top: `${(t.y / HEIGHT) * 100}%`,
              width: `${(t.w / WIDTH) * 100}%`,
              height: `${(t.h / HEIGHT) * 100}%`,
              background: heatColor(0.1 + t.t * 0.7),
            }}
          >
            {t.w > 70 && t.h > 30 && (
              <span
                className="absolute inset-0 flex flex-col justify-end p-1.5"
                style={{ color: t.t > 0.75 ? "#10131a" : "var(--color-ink)" }}
              >
                <span className="truncate font-mono text-[9.5px] font-bold">
                  {t.tag}
                </span>
                <span className="font-mono text-[8.5px] opacity-75 tabular-nums">
                  {t.count.toLocaleString()}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
