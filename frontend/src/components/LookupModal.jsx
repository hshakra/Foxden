import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Shield, Tag, CornerDownLeft } from "lucide-react";
import { api, isNoResult } from "../lib/api";
import useRecentIOCs from "../hooks/useRecentIOCs";
import { usePrefetchFamily } from "../hooks/useFamily";
import { TypeBadge } from "./IOCCard";
import { IOCDrawer } from "./IOCDrawer";
import { SkeletonRows, EmptyState, ErrorState } from "./states";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, TYPE_COLORS } from "../lib/colors";
import { timeAgo } from "../lib/time";
import { midEllipsis } from "../lib/format";
import { Chip } from "./ui/Chip";
import { Badge } from "./ui/Badge";
import { CopyButton } from "./ui/CopyButton";

// global lookup that answers while you type
// every keystroke matches families, tags, and iocs already in range
// enter asks threatfox for the full record of an exact indicator
const MAX_PER_SECTION = 5;

const EXAMPLES = ["AsyncRAT", "ClickFix", "185.215.113.66"];

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

// name what the input looks like so the user knows what a lookup will do
function detectKind(term) {
  const t = term.trim();
  if (!t) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(t)) {
    return { label: t.includes(":") ? "ip:port" : "ip", color: TYPE_COLORS["ip:port"] };
  }
  if (/^[0-9a-f]{64}$/i.test(t)) return { label: "sha256", color: TYPE_COLORS.hash };
  if (/^[0-9a-f]{40}$/i.test(t)) return { label: "sha1", color: TYPE_COLORS.hash };
  if (/^[0-9a-f]{32}$/i.test(t)) return { label: "md5", color: TYPE_COLORS.hash };
  if (/^https?:\/\//i.test(t)) return { label: "url", color: TYPE_COLORS.url };
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(t)) {
    return { label: "domain", color: TYPE_COLORS.domain };
  }
  return null;
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1.5 mt-4 text-secondary font-medium text-ink-low first:mt-0">
      {children}
    </p>
  );
}

// compact result row built for the modal, the copy button owns its column
function LookupRow({ ioc, selected, highlighted, onSelect }) {
  const conf = confidenceInfo(ioc.confidence_level);
  const confColor = CONF_COLORS[conf.tone];
  const isHash = ioc.ioc_type?.endsWith("_hash");

  return (
    <div
      role="row"
      onClick={onSelect}
      className={`flex h-10 cursor-pointer items-center gap-2.5 border-b border-line px-2 transition-colors duration-150 last:border-0 ${
        selected
          ? "bg-lifted shadow-[inset_2px_0_0_var(--color-accent)]"
          : highlighted
            ? "bg-lifted/60"
            : "hover:bg-lifted/60"
      }`}
    >
      <TypeBadge type={ioc.ioc_type} />
      <span
        className="min-w-0 flex-1 truncate font-mono text-secondary"
        title={ioc.ioc}
      >
        {isHash ? midEllipsis(ioc.ioc, 36) : ioc.ioc}
      </span>
      <span
        className="shrink-0 font-mono text-meta tabular-nums"
        style={{ color: conf.tone === "quiet" ? "var(--color-ink-mid)" : confColor }}
      >
        {conf.value} {conf.label}
      </span>
      <span className="shrink-0 font-mono text-meta text-ink-low tabular-nums">
        {timeAgo(ioc.first_seen)}
      </span>
      <CopyButton
        value={ioc.ioc}
        label="Copy IOC value"
        className="grid h-6 w-6 shrink-0 place-content-center rounded-md border border-line text-ink-low transition-colors duration-150 hover:border-line-strong hover:text-ink"
      />
    </div>
  );
}

export function LookupModal({ open, onClose }) {
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
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

  const kind = detectKind(term);

  // reset on the way out so each open starts fresh
  const close = useCallback(() => {
    setTerm("");
    setSubmitted("");
    setSelected(null);
    setHighlighted(-1);
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

  // the list the arrow keys walk through
  const rows = showLocal ? local.iocs : submitted ? (result.data ?? []) : [];

  function onInputKeyDown(e) {
    if (rows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      setSelected(rows[highlighted]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="IOC lookup"
        onClick={(e) => e.stopPropagation()}
        className="reveal w-full max-w-3xl rounded-lg border border-line-strong bg-overlay p-4 shadow-2xl"
      >
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            setSelected(null);
            setHighlighted(-1);
            setSubmitted(term.trim());
          }}
        >
          <Search size={15} className="shrink-0 text-ink-low" />
          <input
            autoFocus
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setSubmitted("");
              setHighlighted(-1);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Type to search this range, enter for full ThreatFox lookup"
            className="min-w-0 flex-1 bg-transparent font-mono text-secondary text-ink placeholder:text-ink-low focus:outline-none"
          />
          {kind && <Badge color={kind.color}>{kind.label}</Badge>}
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-secondary font-medium text-white transition-colors duration-150 hover:bg-accent/85"
          >
            <CornerDownLeft size={11} /> ThreatFox
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close lookup"
            className="text-ink-low transition-colors duration-150 hover:text-ink"
          >
            <X size={15} />
          </button>
        </form>

        {!local && !submitted && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-secondary text-ink-mid">
              Search anything in the current range, or press enter to ask
              ThreatFox about an exact indicator.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <Chip key={ex} onClick={() => setTerm(ex)}>
                  {ex}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {showLocal && (
          <div className="mt-3 border-t border-line pt-3">
            {localEmpty ? (
              <p className="text-secondary text-ink-low">
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
                        <Chip
                          key={name}
                          to={`/family/${encodeURIComponent(name)}`}
                          onClick={close}
                          onMouseEnter={() => prefetchFamily(name)}
                        >
                          <Shield size={11} className="text-ink-low" />
                          {name}
                          <b className="font-mono text-meta text-accent-soft tabular-nums">
                            {count}
                          </b>
                        </Chip>
                      ))}
                    </div>
                  </>
                )}

                {local.tags.length > 0 && (
                  <>
                    <SectionLabel>Tags in range</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {local.tags.map(([tag, count]) => (
                        <Chip
                          key={tag}
                          to={`/tag/${encodeURIComponent(tag)}`}
                          onClick={close}
                        >
                          <Tag size={10} className="text-ink-low" />
                          {tag}
                          <b className="font-mono text-meta text-ink-mid tabular-nums">
                            {count}
                          </b>
                        </Chip>
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
                        {local.iocs.map((ioc, i) => (
                          <LookupRow
                            key={ioc.id}
                            ioc={ioc}
                            selected={selected?.id === ioc.id}
                            highlighted={highlighted === i}
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
              isNoResult(result.error) ? (
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
                  {result.data.map((ioc, i) => (
                    <LookupRow
                      key={ioc.id}
                      ioc={ioc}
                      selected={selected?.id === ioc.id}
                      highlighted={highlighted === i}
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
