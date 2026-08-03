/*
  Confidence display: color + text label, never color alone (rule 4).
  ThreatFox confidence_level is 0–100.
*/
export function confidenceInfo(level) {
  const n = Number(level) || 0;
  if (n >= 75) return { label: "HIGH", color: "good", value: n };
  if (n >= 50) return { label: "MED", color: "warn", value: n };
  return { label: "LOW", color: "bad", value: n };
}
