// the one badge, a small bordered mono label tinted by its color
export function Badge({ color = "var(--color-ink-mid)", title, children }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-meta whitespace-nowrap"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 25%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
