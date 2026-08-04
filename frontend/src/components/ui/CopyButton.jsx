import { useState } from "react";
import { Copy, Check } from "lucide-react";

// the one copy affordance, owns its copied flash
// callers that reveal on hover stay visible while the check shows
export function CopyButton({ value, size = 12, label = "Copy value", className = "" }) {
  const [copied, setCopied] = useState(false);

  async function copy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`${className} ${copied ? "opacity-100" : ""}`}
    >
      {copied ? (
        <Check size={size} className="text-accent-soft" />
      ) : (
        <Copy size={size} />
      )}
    </button>
  );
}
