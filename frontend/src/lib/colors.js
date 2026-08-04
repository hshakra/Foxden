// shared color lookups so charts and badges never drift apart
// values point at the design tokens in index.css

export const TYPE_COLORS = {
  "ip:port": "var(--color-t-ip)",
  domain: "var(--color-t-domain)",
  url: "var(--color-t-url)",
  hash: "var(--color-t-hash)",
  md5_hash: "var(--color-t-hash)",
  sha256_hash: "var(--color-t-hash)",
  sha1_hash: "var(--color-t-hash)",
};

export const CONF_COLORS = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
};

export function typeColor(type) {
  return TYPE_COLORS[type] ?? "var(--color-slate)";
}
