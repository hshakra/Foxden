// one kpi tile shape for every page
// children render under the number, a sparkbar or a context line
export function StatTile({ label, value, onClick, children }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border border-line bg-surface-1 px-3.5 py-3 text-left ${
        onClick
          ? "transition-colors hover:border-line-2 hover:bg-surface-2/40"
          : ""
      }`}
    >
      <p className="text-[11.5px] font-medium text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {children}
    </Tag>
  );
}
