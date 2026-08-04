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
  quiet: "var(--color-conf-high)",
  warn: "var(--color-conf-med)",
  bad: "var(--color-conf-low)",
};

// what the attacker uses the indicator for
export const THREAT_COLORS = {
  botnet_cc: "var(--color-accent)",
  payload_delivery: "var(--color-t-url)",
  payload: "var(--color-t-hash)",
  phishing: "var(--color-t-domain)",
  other: "var(--color-ink-low)",
};

export const THREAT_LABELS = {
  botnet_cc: "botnet C2",
  payload_delivery: "malware delivery",
  payload: "payload",
  phishing: "phishing",
  other: "other",
};

// plain language behind the jargon, used as hover titles
export const THREAT_TITLES = {
  botnet_cc: "botnet command and control, where infected machines call home",
  payload_delivery: "infrastructure that delivers malware to victims",
  payload: "the malware file itself",
  phishing: "credential or identity theft pages",
};

export function typeColor(type) {
  return TYPE_COLORS[type] ?? "var(--color-ink-low)";
}

// thermal ramp for intensity charts, a little warmer than the chrome
// deep indigo through glaucous, peaking at a muted sand, never neon
const RAMP = ["#262c47", "#4a5686", "#7180b9", "#93a3d6", "#bfae8a"];

export function heatColor(t) {
  if (t <= 0) return "var(--color-bg)";
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (RAMP.length - 1);
  const low = Math.floor(scaled);
  const high = Math.min(low + 1, RAMP.length - 1);
  const mix = Math.round((scaled - low) * 100);
  return `color-mix(in oklab, ${RAMP[high]} ${mix}%, ${RAMP[low]})`;
}

// the same ramp as a css gradient, for written keys beside intensity visuals
export function heatGradient() {
  return `linear-gradient(90deg, ${RAMP.join(", ")})`;
}

export function threatColor(threat) {
  return THREAT_COLORS[threat] ?? THREAT_COLORS.other;
}
