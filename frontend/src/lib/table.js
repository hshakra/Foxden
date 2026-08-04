// the one table spec, every table pulls from here so they never drift
// flat on the canvas with hairlines, no zebra, no boxes
export const table = {
  // sticky header, 12px medium, sentence case labels
  header: "sticky top-0 z-10 bg-bg",
  headerCell:
    "px-3 py-2 text-left text-secondary font-medium text-ink-low whitespace-nowrap",
  headerCellNum:
    "px-3 py-2 text-right text-secondary font-medium text-ink-low whitespace-nowrap",
  // 40px rows, hover moves one ladder step
  row: "h-10 border-b border-line transition-colors duration-150 hover:bg-raised",
  // selection is a lifted surface plus a 2px accent left edge
  rowSelected: "bg-lifted shadow-[inset_2px_0_0_var(--color-accent)]",
  cell: "px-3 text-body",
  cellNum: "px-3 text-body font-mono tabular-nums text-right",
};
