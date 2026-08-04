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

// quiet is the norm in dim green, alert colors mark the exceptions
export const CONF_COLORS = {
  quiet: "var(--color-good-dim)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
};

// what the attacker uses the indicator for
export const THREAT_COLORS = {
  botnet_cc: "var(--color-accent)",
  payload_delivery: "var(--color-t-url)",
  payload: "var(--color-t-hash)",
  phishing: "var(--color-t-domain)",
  other: "var(--color-slate)",
};

export const THREAT_LABELS = {
  botnet_cc: "botnet C2",
  payload_delivery: "malware delivery",
  payload: "payload",
  phishing: "phishing",
  other: "other",
};

export function typeColor(type) {
  return TYPE_COLORS[type] ?? "var(--color-slate)";
}

export function threatColor(threat) {
  return THREAT_COLORS[threat] ?? THREAT_COLORS.other;
}
