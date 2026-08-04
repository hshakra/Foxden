import { typeColor } from "../../lib/colors";

// names the mix bar colors wherever one appears
export function TypeLegend() {
  const types = ["ip:port", "domain", "url", "hash"];
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[8.5px] text-ink-3">
      {types.map((t) => (
        <span key={t} className="flex items-center gap-1">
          <span
            className="h-[6px] w-[6px] rounded-[2px]"
            style={{ background: typeColor(t) }}
          />
          {t}
        </span>
      ))}
    </span>
  );
}
