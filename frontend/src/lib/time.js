/*
  ThreatFox timestamps look like "2026-05-21 21:58:26 UTC".
  Parse them safely and render compact "time ago" strings.
*/
export function parseThreatFoxDate(value) {
  if (!value) return null;
  const iso = value.replace(" ", "T").replace(" UTC", "Z");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function timeAgo(value) {
  const d = value instanceof Date ? value : parseThreatFoxDate(value);
  if (!d) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}
