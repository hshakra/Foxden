// the one chip, a small clickable value that filters or navigates
export function Chip({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-secondary transition-colors duration-150 ${
        active
          ? "border-accent/50 bg-accent/10 text-accent-soft"
          : "border-line bg-lifted text-ink-mid hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
