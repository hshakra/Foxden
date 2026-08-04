import { useMemo } from "react";
import { typeColor, threatColor, THREAT_LABELS } from "../lib/colors";

// the browse page sidebar, every facet row is a live count and a filter
// clicking toggles, the active row highlights

function FacetRow({ label, count, active, swatch, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-secondary transition-colors duration-150 ${
        active
          ? "bg-lifted text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
          : "text-ink-mid hover:bg-lifted/60"
      }`}
    >
      {swatch && (
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
          style={{ background: swatch }}
        />
      )}
      <span className="truncate">{label}</span>
      <span className="ml-auto font-mono text-meta text-ink-low tabular-nums">
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-1 text-meta font-medium text-ink-low">{title}</p>
      {children}
    </div>
  );
}

export function FacetRail({
  iocs,
  typeFilter,
  onTypeFilterChange,
  threatFilter,
  onThreatFilterChange,
  familyFilter,
  onFamilyFilterChange,
}) {
  const facets = useMemo(() => {
    const types = {};
    const threats = {};
    const families = {};
    for (const ioc of iocs) {
      const t = ioc.ioc_type.endsWith("_hash") ? "hash" : ioc.ioc_type;
      types[t] = (types[t] || 0) + 1;
      threats[ioc.threat_type] = (threats[ioc.threat_type] || 0) + 1;
      families[ioc.malware_printable] =
        (families[ioc.malware_printable] || 0) + 1;
    }
    const rank = (obj, limit) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    return {
      types: rank(types, 4),
      threats: rank(threats, 5),
      families: rank(families, 7),
    };
  }, [iocs]);

  function toggle(list, value, set) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <aside className="flex h-fit flex-col gap-4 rounded-lg border border-line bg-raised p-3">
      <Section title="Type">
        {facets.types.map(([type, count]) => (
          <FacetRow
            key={type}
            label={type}
            count={count}
            swatch={typeColor(type)}
            active={typeFilter.includes(type)}
            onClick={() => toggle(typeFilter, type, onTypeFilterChange)}
          />
        ))}
      </Section>
      <Section title="Threat">
        {facets.threats.map(([threat, count]) => (
          <FacetRow
            key={threat}
            label={THREAT_LABELS[threat] ?? threat}
            count={count}
            swatch={threatColor(threat)}
            active={threatFilter.includes(threat)}
            onClick={() => toggle(threatFilter, threat, onThreatFilterChange)}
          />
        ))}
      </Section>
      <Section title="Top families">
        {facets.families.map(([family, count]) => (
          <FacetRow
            key={family}
            label={family}
            count={count}
            active={familyFilter === family}
            onClick={() =>
              onFamilyFilterChange(familyFilter === family ? null : family)
            }
          />
        ))}
      </Section>
    </aside>
  );
}
