// the one kpi tile, a number never stands alone
// label, numeral, comparison line, optional spark, all on shared baselines
export function StatTile({ label, value, comparison, spark, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex flex-col rounded-lg border border-line bg-raised p-4 text-left ${
        onClick
          ? "transition-colors duration-150 hover:border-line-strong hover:bg-lifted"
          : ""
      }`}
    >
      <p className="text-secondary font-medium text-ink-low">{label}</p>
      <p className="mt-2 font-mono text-display font-semibold tracking-tight tabular-nums">
        {value ?? <span className="text-ink-low">–</span>}
      </p>
      <div className="mt-1 text-secondary text-ink-mid">
        {comparison ?? <span className="text-ink-low">–</span>}
      </div>
      {spark && <div className="mt-3">{spark}</div>}
    </Tag>
  );
}
