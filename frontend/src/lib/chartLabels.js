// date label helpers shared by the chart components

// "2026-08-04" reads as "Aug 4", hourly labels pass through
export function shortLabel(date) {
  if (!date || !date.includes("-")) return date;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "Jul 29 to Aug 4" for column headers above per row sparklines
export function sparkRange(points) {
  if (!points?.length) return "";
  return `${shortLabel(points[0].date)} to ${shortLabel(
    points[points.length - 1].date,
  )}`;
}
