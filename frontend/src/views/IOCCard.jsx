import { Link, useNavigate } from "react-router-dom";
import { Copy, Check, MoreVertical, ExternalLink, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "../lib/time";
import { confidenceInfo } from "../lib/confidence";

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

const CONF_COLORS = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
};

export function TypeBadge({ type }) {
  return (
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 font-mono text-[9px] whitespace-nowrap ${
        TYPE_STYLES[type] ?? "text-slate bg-slate/10 border-slate/25"
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function ConfidenceCell({ level }) {
  const conf = confidenceInfo(level);
  const color = CONF_COLORS[conf.color];
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[5px] w-6 shrink-0 overflow-hidden rounded-sm bg-surface-0">
        <span
          className="block h-full"
          style={{ width: `${conf.value}%`, background: color }}
        />
      </span>
      <b className="font-mono text-[9.5px] tabular-nums" style={{ color }}>
        {conf.value}
      </b>
      <small className="font-mono text-[8.5px] text-ink-3">{conf.label}</small>
    </span>
  );
}

/*
  One IOC as a feed row: type badge · mono value + copy · family link ·
  confidence (color + label, rule 4) · time ago · overflow menu.
*/
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
      className={`group grid cursor-pointer grid-cols-[70px_minmax(0,1fr)_130px_120px_42px_26px] items-center gap-2.5 rounded-md border-b border-line px-2 py-2 text-xs transition-colors ${
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
        // cross-filter in place (rule 1); the profile link lives in the drawer
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

      <RowMenu ioc={ioc} onCopy={copyValue} />
    </div>
  );
}

/* per-row actions behind an overflow menu (rule 11) */
function RowMenu({ ioc, onCopy }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function onClickAway(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-ink-2 hover:bg-surface-2 hover:text-ink";

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        aria-label="Row actions"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`text-ink-3 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${
          open ? "" : "opacity-0"
        }`}
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <span
          className="absolute right-0 top-6 z-20 w-44 overflow-hidden rounded-lg border border-line-2 bg-surface-3 py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={itemClass}
            onClick={(e) => {
              onCopy(e);
              setOpen(false);
            }}
          >
            <Copy size={12} /> Copy value
          </button>
          <a
            href={`https://www.virustotal.com/gui/search/${encodeURIComponent(ioc.ioc)}`}
            target="_blank"
            rel="noreferrer"
            className={itemClass}
          >
            <ExternalLink size={12} /> VirusTotal
          </a>
          <button
            type="button"
            className={itemClass}
            onClick={() =>
              navigate(`/family/${encodeURIComponent(ioc.malware_printable)}`)
            }
          >
            <Shield size={12} /> Family profile
          </button>
        </span>
      )}
    </span>
  );
}
