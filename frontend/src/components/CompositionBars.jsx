import { useMemo } from "react";
import { typeDistribution, threatDistribution } from "../lib/processor";
import {
  typeColor,
  threatColor,
  THREAT_LABELS,
  THREAT_TITLES,
} from "../lib/colors";

// the two distribution bars of the overview, what kind and what for
// every segment filters the feed on click, counts sit in the legend

function Bar({ label, parts, colorFor, labelFor, titleFor, onClick }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-secondary font-medium text-ink-low">{label}</p>
      <div className="flex h-2.5 gap-[3px]">
        {parts.map((d) => (
          <button
            key={d.type}
            type="button"
            title={`Filter feed to ${labelFor(d.type)}`}
            onClick={() => onClick?.(d.type)}
            className="rounded-sm transition-opacity duration-150 hover:opacity-80"
            style={{ width: `${d.pct}%`, background: colorFor(d.type) }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-secondary text-ink-mid">
        {parts.map((d) => (
          <button
            key={d.type}
            type="button"
            onClick={() => onClick?.(d.type)}
            title={titleFor?.(d.type)}
            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-ink"
          >
            <span
              className="h-1.5 w-1.5 rounded-[2px]"
              style={{ background: colorFor(d.type) }}
            />
            {labelFor(d.type)}
            <span className="font-mono text-meta text-ink tabular-nums">
              {d.count.toLocaleString()}
            </span>
            <span className="font-mono text-meta text-ink-low tabular-nums">
              {d.pct}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompositionBars({ iocs, onTypeClick, onThreatClick }) {
  const types = useMemo(() => typeDistribution(iocs), [iocs]);
  const threats = useMemo(() => threatDistribution(iocs), [iocs]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Bar
        label="By type"
        parts={types}
        colorFor={typeColor}
        labelFor={(t) => t}
        onClick={onTypeClick}
      />
      <Bar
        label="By use"
        parts={threats.slice(0, 4)}
        colorFor={threatColor}
        labelFor={(t) => THREAT_LABELS[t] ?? t}
        titleFor={(t) => THREAT_TITLES[t]}
        onClick={onThreatClick}
      />
    </div>
  );
}
