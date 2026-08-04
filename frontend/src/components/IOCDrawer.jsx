import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { TypeBadge } from "../views/IOCCard";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, THREAT_LABELS } from "../lib/colors";
import { timeAgo } from "../lib/time";
import { midEllipsis } from "../lib/format";
import { Chip } from "./ui/Chip";

// everything about one ioc, shown beside the feed with no navigation
// verdict first, then only the evidence rows that actually have data,
// then related iocs to pivot through, then the external links

function Row({ k, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 text-secondary last:border-0">
      <span className="font-medium text-ink-low">{k}</span>
      <span className="min-w-0 text-right font-mono text-meta text-ink">
        {children}
      </span>
    </div>
  );
}

export function IOCDrawer({ ioc, onClose, onFilterFamily, onNavigate, pool }) {
  const [copied, setCopied] = useState(false);

  // same family, most recent first, to keep the pivot going
  const related = useMemo(() => {
    if (!pool || !ioc) return [];
    return pool
      .filter(
        (other) =>
          other.malware_printable === ioc.malware_printable &&
          other.id !== ioc.id,
      )
      .sort((a, b) => b.first_seen.localeCompare(a.first_seen))
      .slice(0, 4);
  }, [pool, ioc]);

  if (!ioc) return null;
  const conf = confidenceInfo(ioc.confidence_level);
  const confColor = CONF_COLORS[conf.tone];

  async function copyValue() {
    await navigator.clipboard.writeText(ioc.ioc);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const vtUrl = `https://www.virustotal.com/gui/search/${encodeURIComponent(ioc.ioc)}`;
  const tfUrl = `https://threatfox.abuse.ch/ioc/${ioc.id}/`;
  // malwarebazaar only holds samples, so hashes only
  const bazaarUrl = ioc.ioc_type?.endsWith("_hash")
    ? `https://bazaar.abuse.ch/browse.php?search=${encodeURIComponent(
        `${ioc.ioc_type.replace("_hash", "")}:${ioc.ioc}`,
      )}`
    : null;

  return (
    <aside
      aria-label="IOC details"
      className="relative flex h-fit flex-col rounded-lg border border-line-strong bg-overlay p-4 shadow-xl"
    >
      <div className="mb-2 flex items-center gap-2">
        <TypeBadge type={ioc.ioc_type} />
        <span className="text-secondary font-medium text-ink-low">
          Details
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="ml-auto text-ink-low transition-colors duration-150 hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>

      {/* the copy button keeps its own column so it never squeezes the value */}
      <div className="mb-2 flex items-start gap-2.5 rounded-lg border border-line bg-bg p-2.5">
        <code
          className="min-w-0 flex-1 break-all font-mono text-secondary leading-relaxed"
          title={ioc.ioc}
        >
          {midEllipsis(ioc.ioc, 56)}
        </code>
        <button
          type="button"
          onClick={copyValue}
          aria-label="Copy IOC value"
          className="grid h-6 w-6 shrink-0 place-content-center rounded-md border border-line text-ink-low transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          {copied ? (
            <Check size={13} className="text-accent-soft" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>

      {/* verdict band answers how bad and how sure before anything else */}
      <div
        className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{
          background: `color-mix(in oklab, ${confColor} 12%, var(--color-lifted))`,
        }}
      >
        <span
          className="rounded-md px-2 py-0.5 font-mono text-meta font-medium"
          style={{ background: confColor, color: "var(--color-bg)" }}
        >
          {conf.label}
        </span>
        <span className="font-mono text-meta text-ink tabular-nums">
          Confidence {conf.value}
        </span>
        <span className="ml-auto text-meta text-ink-mid">
          {THREAT_LABELS[ioc.threat_type] ?? ioc.threat_type}
        </span>
      </div>

      <Row k="Family">
        <Link
          to={`/family/${encodeURIComponent(ioc.malware_printable)}`}
          onClick={onNavigate}
          className="text-accent-soft hover:underline"
        >
          {ioc.malware_printable}
        </Link>
      </Row>
      {ioc.first_seen && (
        <Row k="First seen">
          {ioc.first_seen.replace(" UTC", "")} UTC, {timeAgo(ioc.first_seen)}{" "}
          ago
        </Row>
      )}
      {ioc.reporter && <Row k="Reporter">{ioc.reporter}</Row>}
      {ioc.reference && (
        <Row k="Reference">
          <a
            href={ioc.reference}
            target="_blank"
            rel="noreferrer"
            className="text-accent-soft hover:underline"
          >
            source <ExternalLink size={9} className="inline" />
          </a>
        </Row>
      )}
      {ioc.tags?.length > 0 && (
        <div className="border-b border-line py-2">
          <span className="text-secondary font-medium text-ink-low">Tags</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ioc.tags.map((t) => (
              <Chip
                key={t}
                to={`/tag/${encodeURIComponent(t)}`}
                onClick={onNavigate}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="border-b border-line py-2">
          <span className="text-secondary font-medium text-ink-low">
            More from {ioc.malware_printable}
          </span>
          <div className="mt-1.5 flex flex-col gap-1">
            {related.map((other) => (
              <div
                key={other.id}
                className="flex items-center gap-2 font-mono text-meta"
              >
                <span className="truncate text-ink-mid" title={other.ioc}>
                  {other.ioc}
                </span>
                <span className="ml-auto shrink-0 text-ink-low tabular-nums">
                  {timeAgo(other.first_seen)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {onFilterFamily && (
          <button
            type="button"
            onClick={() => onFilterFamily(ioc.malware_printable)}
            className="rounded-md bg-accent px-2.5 py-1.5 text-secondary font-medium text-white transition-colors duration-150 hover:bg-accent/85"
          >
            Filter feed to family
          </button>
        )}
        <a
          href={vtUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-md border border-line bg-lifted px-2.5 py-1.5 text-secondary font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          <ExternalLink size={11} /> VirusTotal
        </a>
        {bazaarUrl && (
          <a
            href={bazaarUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-md border border-line bg-lifted px-2.5 py-1.5 text-secondary font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            <ExternalLink size={11} /> MalwareBazaar
          </a>
        )}
        <a
          href={tfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-md border border-line bg-lifted px-2.5 py-1.5 text-secondary font-medium text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink"
        >
          <ExternalLink size={11} /> ThreatFox
        </a>
      </div>
    </aside>
  );
}
