import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Shield, Tag, CornerDownLeft } from "lucide-react";
import { api } from "../lib/api";
import useRecentIOCs from "../hooks/useRecentIOCS";
import { usePrefetchFamily } from "../hooks/useFamily";
import { IOCCard } from "../views/IOCCard";
import { IOCDrawer } from "./IOCDrawer";
import { SkeletonRows, EmptyState, ErrorState } from "./states";

// global lookup that answers while you type
// every keystroke matches families, tags, and iocs already in range
// enter asks threatfox for the full record of an exact indicator
const MAX_PER_SECTION = 5;

function localMatches(iocs, term) {
  const q = term.toLowerCase();
  const families = new Map();
  const tags = new Map();
  const hits = [];
  for (const ioc of iocs) {
    const family = ioc.malware_printable ?? "";
    if (family.toLowerCase().includes(q)) {
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    for (const tag of ioc.tags ?? []) {
      if (tag.toLowerCase().includes(q)) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
    }
    if (hits.length < MAX_PER_SECTION && ioc.ioc.toLowerCase().includes(q)) {
      hits.push(ioc);
    }
  }
  const rank = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PER_SECTION);
  return { families: rank(families), tags: rank(tags), iocs: hits };
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1 mt-3 text-[11px] font-medium text-ink-3 first:mt-0">
      {children}
    </p>
  );
}

export function LookupModal({ open, onClose }) {
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState(null);
  const recent = useRecentIOCs();
  const prefetchFamily = usePrefetchFamily();

  const result = useQuery({
    queryKey: ["lookup", submitted],
    queryFn: () => api.search(submitted),
    select: (data) => data.data ?? [],
    enabled: submitted.length > 2,
    retry: false,
    refetchInterval: false,
  });

  // live matches from what is already loaded, no network needed
  const pool = recent.data?.current;
  const local = useMemo(() => {
    const q = term.trim();
    if (q.length < 2) return null;
    return localMatches(pool ?? [], q);
  }, [term, pool]);

  // reset on the way out so each open starts fresh
  const close = useCallback(() => {
    setTerm("");
    setSubmitted("");
    setSelected(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") close();
    }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [open, close]);

  if (!open) return null;

  const showLocal = local && !submitted;
  const localEmpty =
    showLocal &&
    local.families.length === 0 &&
    local.tags.length === 0 &&
    local.iocs.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface-0/70 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="IOC lookup"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl border border-line-2 bg-surface-3 p-4 shadow-2xl"
      >
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setSelected(null);
            setSubmitted(term.trim());
          }}
        >
          <Search size={15} className="shrink-0 text-ink-3" />
          <input
            autoFocus
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setSubmitted("");
            }}
            placeholder="Type to search this range, enter for full ThreatFox lookup…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-accent/85"
          >
            <CornerDownLeft size={11} /> ThreatFox
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close lookup"
            className="text-ink-3 hover:text-ink"
          >
            <X size={15} />
          </button>
        </form>

        {showLocal && (
          <div className="mt-3 border-t border-line pt-3">
            {localEmpty ? (
              <p className="font-mono text-[11px] text-ink-3">
                Nothing in the current range matches. Press enter to search all
                of ThreatFox.
              </p>
            ) : (
              <>
                {local.families.length > 0 && (
                  <>
                    <SectionLabel>Families in range</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {local.families.map(([name, count]) => (
                        <Link
                          key={name}
                          to={`/family/${encodeURIComponent(name)}`}
                          onClick={close}
                          onMouseEnter={() => prefetchFamily(name)}
                          className="flex items-center gap-1.5 rounded-lg border border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink hover:border-accent hover:text-accent-soft"
                        >
                          <Shield size={11} className="text-ink-3" />
                          {name}
                          <b className="font-mono text-[10px] text-accent-soft tabular-nums">
                            {count}
                          </b>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                {local.tags.length > 0 && (
                  <>
                    <SectionLabel>Tags in range</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {local.tags.map(([tag, count]) => (
                        <Link
                          key={tag}
                          to={`/tag/${encodeURIComponent(tag)}`}
                          onClick={close}
                          className="flex items-center gap-1.5 rounded-md border border-t-domain/25 bg-t-domain/10 px-2.5 py-1 font-mono text-[10px] text-t-domain hover:border-accent/60"
                        >
                          <Tag size={10} />
                          {tag}
                          <b className="text-ink-2 tabular-nums">{count}</b>
                        </Link>
                      ))}
                    </div>
                  </>
                )}

                {local.iocs.length > 0 && (
                  <>
                    <SectionLabel>IOCs in range</SectionLabel>
                    <div
                      className={`grid items-start gap-3 ${
                        selected ? "md:grid-cols-[minmax(0,1fr)_280px]" : ""
                      }`}
                    >
                      <div>
                        {local.iocs.map((ioc) => (
                          <IOCCard
                            key={ioc.id}
                            ioc={ioc}
                            selected={selected?.id === ioc.id}
                            onSelect={() => setSelected(ioc)}
                          />
                        ))}
                      </div>
                      {selected && (
                        <IOCDrawer
                          ioc={selected}
                          onClose={() => setSelected(null)}
                          onNavigate={close}
                          pool={pool}
                        />
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {submitted && (
          <div className="mt-3 border-t border-line pt-3">
            {submitted.length <= 2 ? (
              <EmptyState
                title="That search is too short"
                hint="Enter at least 3 characters."
              />
            ) : result.isPending ? (
              <SkeletonRows rows={3} />
            ) : result.isError ? (
              result.error.message.includes("no_result") ? (
                <EmptyState
                  title="No ThreatFox record for that indicator"
                  hint="That can be good news, it is not in the abuse.ch database."
                />
              ) : (
                <ErrorState error={result.error} onRetry={() => result.refetch()} />
              )
            ) : result.data.length === 0 ? (
              <EmptyState
                title="No ThreatFox record for that indicator"
                hint="That can be good news, it is not in the abuse.ch database."
              />
            ) : (
              <div
                className={`grid items-start gap-3 ${
                  selected ? "md:grid-cols-[minmax(0,1fr)_280px]" : ""
                }`}
              >
                <div>
                  <SectionLabel>ThreatFox records</SectionLabel>
                  {result.data.map((ioc) => (
                    <IOCCard
                      key={ioc.id}
                      ioc={ioc}
                      selected={selected?.id === ioc.id}
                      onSelect={() => setSelected(ioc)}
                    />
                  ))}
                </div>
                {selected && (
                  <IOCDrawer
                    ioc={selected}
                    onClose={() => setSelected(null)}
                    onNavigate={close}
                    pool={pool}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
