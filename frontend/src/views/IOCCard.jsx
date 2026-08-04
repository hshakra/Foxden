import { Link } from "react-router-dom";
import { Copy, Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "../lib/time";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS } from "../lib/colors";

const TYPE_STYLES = {
  "ip:port": "text-t-ip bg-t-ip/10 border-t-ip/25",
  domain: "text-t-domain bg-t-domain/10 border-t-domain/25",
  url: "text-t-url bg-t-url/10 border-t-url/25",
  md5_hash: "text-t-hash bg-t-hash/10 border-t-hash/30",
  sha256_hash: "text-t-hash bg-t-hash/10 border-t-hash/30",
  sha1_hash: "text-t-hash bg-t-hash/10 border-t-hash/30",
};

const TYPE_LABELS = {
  md5_hash: "md5",
  sha256_hash: "sha256",
  sha1_hash: "sha1",
};

export function TypeBadge({ type }) {
  return (
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap ${
        TYPE_STYLES[type] ?? "text-ink-mid bg-ink-low/10 border-ink-low/25"
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// high confidence is the norm here so it stays quiet
// only medium and low get alert colors
export function ConfidenceCell({ level }) {
  const conf = confidenceInfo(level);
  const color = CONF_COLORS[conf.tone];
  const quiet = conf.tone === "quiet";
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[5px] w-6 shrink-0 overflow-hidden rounded-sm bg-surface-0">
        <span
          className="block h-full"
          style={{
            width: `${conf.value}%`,
            background: color,
            opacity: quiet ? 0.7 : 1,
          }}
        />
      </span>
      <b
        className="font-mono text-[9.5px] font-semibold tabular-nums"
        style={{ color }}
      >
        {conf.value}
      </b>
      <small
        className="font-mono text-[8.5px]"
        style={{ color: quiet ? "var(--color-ink-3)" : color }}
      >
        {conf.label}
      </small>
    </span>
  );
}

// one ioc as a feed row
// type badge, mono value with copy, family, confidence, time ago, chevron
export function IOCCard({ ioc, selected, onSelect, onFamilyClick }) {
  const [copied, setCopied] = useState(false);

  async function copyValue(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(ioc.ioc);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
      className={`group grid cursor-pointer grid-cols-[70px_minmax(0,1fr)_130px_120px_42px_20px] items-center gap-2.5 rounded-md border-b border-line px-2 py-2 text-xs transition-colors ${
        selected
          ? "border-transparent bg-surface-2 shadow-[inset_2px_0_0_var(--color-accent)]"
          : "hover:bg-surface-2/50"
      }`}
    >
      <TypeBadge type={ioc.ioc_type} />

      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-mono text-[10.5px]" title={ioc.ioc}>
          {ioc.ioc}
        </span>
        <button
          type="button"
          onClick={copyValue}
          aria-label="Copy IOC value"
          className={`shrink-0 text-ink-3 transition-opacity hover:text-ink ${
            copied ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          {copied ? (
            <Check size={12} className="text-good" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </span>

      {onFamilyClick ? (
        // filters the feed in place, the profile link lives in the drawer
        <button
          type="button"
          title={`Filter feed to ${ioc.malware_printable}`}
          onClick={(e) => {
            e.stopPropagation();
            onFamilyClick();
          }}
          className="truncate text-left text-[11.5px] font-semibold text-accent-soft hover:underline"
        >
          {ioc.malware_printable}
        </button>
      ) : (
        <Link
          to={`/family/${encodeURIComponent(ioc.malware_printable)}`}
          onClick={(e) => e.stopPropagation()}
          title={ioc.malware_printable}
          className="truncate text-[11.5px] font-semibold text-accent-soft hover:underline"
        >
          {ioc.malware_printable}
        </Link>
      )}

      <ConfidenceCell level={ioc.confidence_level} />

      <span className="font-mono text-[9.5px] text-ink-3 tabular-nums">
        {timeAgo(ioc.first_seen)}
      </span>

      <ChevronRight
        size={13}
        className={`shrink-0 justify-self-end transition-colors ${
          selected ? "text-accent-soft" : "text-ink-3 group-hover:text-ink-2"
        }`}
      />
    </div>
  );
}
