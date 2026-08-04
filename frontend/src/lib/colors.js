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

// thermal ramp for intensity charts, a little warmer than the chrome
// deep indigo through glaucous, peaking at a muted sand, never neon
const RAMP = ["#262c47", "#4a5686", "#7180b9", "#93a3d6", "#bfae8a"];

export function heatColor(t) {
  if (t <= 0) return "var(--color-surface-0)";
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (RAMP.length - 1);
  const low = Math.floor(scaled);
  const high = Math.min(low + 1, RAMP.length - 1);
  const mix = Math.round((scaled - low) * 100);
  return `color-mix(in oklab, ${RAMP[high]} ${mix}%, ${RAMP[low]})`;
}

export function threatColor(threat) {
  return THREAT_COLORS[threat] ?? THREAT_COLORS.other;
}
