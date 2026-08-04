// confidence is always shown as a color plus a text label, never color alone
// threatfox confidence_level is 0 to 100
// high confidence is the norm in this feed, so it stays quiet and only
// medium and low get alert colors, the eye should go to the exceptions
export function confidenceInfo(level) {
  const n = Number(level) || 0;
  if (n >= 75) return { label: "HIGH", tone: "quiet", value: n };
  if (n >= 50) return { label: "MED", tone: "warn", value: n };
  return { label: "LOW", tone: "bad", value: n };
}
