import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { TypeBadge, ConfidenceCell } from "../views/IOCCard";
import { timeAgo } from "../lib/time";

// everything about one ioc, shown beside the feed with no navigation
// deep links out to virustotal, malpedia, and threatfox

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

export function IOCDrawer({ ioc, onClose, onFilterFamily, onNavigate }) {
  const [copied, setCopied] = useState(false);
  if (!ioc) return null;

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

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-line bg-surface-0 p-2.5">
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

      <Row k="Family">
        <Link
          to={`/family/${encodeURIComponent(ioc.malware_printable)}`}
          onClick={onNavigate}
          className="text-accent-soft hover:underline"
        >
          {ioc.malware_printable}
        </Link>
      </Row>
      <Row k="Threat">{ioc.threat_type_label ?? ioc.threat_type}</Row>
      <Row k="Confidence">
        <ConfidenceCell level={ioc.confidence_level} />
      </Row>
      <Row k="First seen">
        {ioc.first_seen?.replace(" UTC", "")} · {timeAgo(ioc.first_seen)} ago
      </Row>
      <Row k="Reporter">{ioc.reporter ?? "—"}</Row>
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

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onFilterFamily?.(ioc.malware_printable)}
          className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-accent/85"
        >
          Filter feed to family
        </button>
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
