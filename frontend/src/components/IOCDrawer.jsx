import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { TypeBadge } from "../views/IOCCard";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, THREAT_LABELS } from "../lib/colors";
import { timeAgo } from "../lib/time";

// everything about one ioc, shown beside the feed with no navigation
// verdict first, then only the evidence rows that actually have data,
// then related iocs to pivot through, then the external links

function Row({ k, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-[11px] last:border-0">
      <span className="font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
        {k}
      </span>
      <span className="min-w-0 text-right font-mono text-[10px] text-ink">
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
      className="relative flex h-fit flex-col rounded-xl border border-line-2 bg-surface-3 p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <TypeBadge type={ioc.ioc_type} />
        <span className="font-mono text-[9px] uppercase tracking-widest text-ink-3">
          details
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="ml-auto text-ink-3 hover:text-ink"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mb-2 flex items-start gap-2 rounded-lg border border-line bg-surface-0 p-2.5">
        <code className="min-w-0 flex-1 break-all font-mono text-[10.5px] leading-relaxed">
          {ioc.ioc}
        </code>
        <button
          type="button"
          onClick={copyValue}
          aria-label="Copy IOC value"
          className="shrink-0 text-ink-3 hover:text-ink"
        >
          {copied ? <Check size={13} className="text-good" /> : <Copy size={13} />}
        </button>
      </div>

      {/* verdict band answers how bad and how sure before anything else */}
      <div
        className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{
          background: `color-mix(in oklab, ${confColor} 12%, var(--color-surface-2))`,
        }}
      >
        <span
          className="rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
          style={{ background: confColor, color: "#10131a" }}
        >
          {conf.label}
        </span>
        <span className="font-mono text-[10.5px] text-ink tabular-nums">
          confidence {conf.value}
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-2">
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
          {ioc.first_seen.replace(" UTC", "")} · {timeAgo(ioc.first_seen)} ago
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
        <div className="border-b border-line py-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
            Tags
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ioc.tags.map((t) => (
              <Link
                key={t}
                to={`/tag/${encodeURIComponent(t)}`}
                onClick={onNavigate}
                className="rounded-full border border-t-domain/25 bg-t-domain/10 px-2 py-0.5 font-mono text-[9px] text-t-domain hover:border-accent/60"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="border-b border-line py-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-widest text-ink-3">
            More from {ioc.malware_printable}
          </span>
          <div className="mt-1.5 flex flex-col gap-1">
            {related.map((other) => (
              <div
                key={other.id}
                className="flex items-center gap-2 font-mono text-[10px]"
              >
                <span className="truncate text-ink-2" title={other.ioc}>
                  {other.ioc}
                </span>
                <span className="ml-auto shrink-0 text-[9px] text-ink-3 tabular-nums">
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
            className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-accent/85"
          >
            Filter feed to family
          </button>
        )}
        <a
          href={vtUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold hover:border-accent hover:text-accent-soft"
        >
          <ExternalLink size={11} /> VirusTotal
        </a>
        {bazaarUrl && (
          <a
            href={bazaarUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold hover:border-accent hover:text-accent-soft"
          >
            <ExternalLink size={11} /> MalwareBazaar
          </a>
        )}
        <a
          href={tfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg border border-line-2 bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold hover:border-accent hover:text-accent-soft"
        >
          <ExternalLink size={11} /> ThreatFox
        </a>
      </div>
    </aside>
  );
}
