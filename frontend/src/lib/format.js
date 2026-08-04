// middle ellipsis keeps both ends of a hash visible
export function midEllipsis(value, max = 40) {
  if (!value || value.length <= max) return value;
  const half = Math.floor((max - 1) / 2);
  return `${value.slice(0, half)}…${value.slice(-half)}`;
}
