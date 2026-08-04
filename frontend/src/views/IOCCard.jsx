import { Link } from "react-router-dom";
import { Copy, Check, ChevronRight } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "../lib/time";
import { confidenceInfo } from "../lib/confidence";
import { CONF_COLORS, typeColor } from "../lib/colors";
import { midEllipsis } from "../lib/format";
import { Badge } from "../components/ui/Badge";

const TYPE_LABELS = {
  md5_hash: "md5",
  sha256_hash: "sha256",
  sha1_hash: "sha1",
};

const HASH_TYPES = new Set(["md5_hash", "sha256_hash", "sha1_hash"]);

export function TypeBadge({ type }) {
  return (
    <Badge color={typeColor(type)}>{TYPE_LABELS[type] ?? type}</Badge>
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
      <span className="h-[5px] w-6 shrink-0 overflow-hidden rounded-sm bg-bg">
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
        className="font-mono text-meta font-medium tabular-nums"
        style={{ color }}
      >
        {conf.value}
      </b>
      <small
        className="text-meta"
        style={{ color: quiet ? "var(--color-ink-low)" : color }}
      >
        {conf.label}
      </small>
    </span>
  );
}

// one ioc as a feed row on the shared table spec
// type badge, mono value with copy, family, confidence, time ago, chevron
// the family cell drops out on pages that are already about one family
export function IOCCard({ ioc, selected, onSelect, onFamilyClick, showFamily = true }) {
  const [copied, setCopied] = useState(false);
  const isHash = HASH_TYPES.has(ioc.ioc_type);

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
      className={`group grid h-10 cursor-pointer items-center gap-2.5 border-b border-line px-2 text-body transition-colors duration-150 ${
        showFamily
          ? "grid-cols-[72px_minmax(0,1fr)_130px_120px_42px_20px]"
          : "grid-cols-[72px_minmax(0,1fr)_120px_42px_20px]"
      } ${
        selected
          ? "bg-lifted shadow-[inset_2px_0_0_var(--color-accent)]"
          : "hover:bg-raised"
      }`}
    >
      <TypeBadge type={ioc.ioc_type} />

      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="truncate font-mono text-secondary"
          title={ioc.ioc}
        >
          {isHash ? midEllipsis(ioc.ioc, 36) : ioc.ioc}
        </span>
        <button
          type="button"
          onClick={copyValue}
          aria-label="Copy IOC value"
          className={`shrink-0 text-ink-low transition-opacity hover:text-ink ${
            copied ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          {copied ? (
            <Check size={12} className="text-accent-soft" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </span>

      {showFamily &&
        (onFamilyClick ? (
          // filters the feed in place, the profile link lives in the drawer
          <button
            type="button"
            title={`Filter feed to ${ioc.malware_printable}`}
            onClick={(e) => {
              e.stopPropagation();
              onFamilyClick();
            }}
            className="truncate text-left font-medium text-accent-soft hover:underline"
          >
            {ioc.malware_printable}
          </button>
        ) : (
          <Link
            to={`/family/${encodeURIComponent(ioc.malware_printable)}`}
            onClick={(e) => e.stopPropagation()}
            title={ioc.malware_printable}
            className="truncate font-medium text-accent-soft hover:underline"
          >
            {ioc.malware_printable}
          </Link>
        ))}

      <ConfidenceCell level={ioc.confidence_level} />

      <span className="font-mono text-meta text-ink-low tabular-nums">
        {timeAgo(ioc.first_seen)}
      </span>

      <ChevronRight
        size={13}
        className={`shrink-0 justify-self-end transition-colors ${
          selected ? "text-accent-soft" : "text-ink-low group-hover:text-ink-mid"
        }`}
      />
    </div>
  );
}
