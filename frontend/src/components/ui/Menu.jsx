import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

// the one dropdown menu, a trigger that always shows its state
// and a small overlay panel of checkable items
export function Menu({ label, active, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-secondary transition-colors duration-150 ${
          active
            ? "border-accent/50 bg-accent/10 text-accent-soft"
            : "border-line bg-lifted text-ink-mid hover:border-line-strong hover:text-ink"
        }`}
      >
        {label}
        <ChevronDown size={12} className="text-ink-low" />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 flex w-52 flex-col overflow-hidden rounded-lg border border-line-strong bg-overlay py-1 shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

export function MenuItem({ checked, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 text-left text-secondary text-ink-mid transition-colors duration-150 hover:bg-lifted hover:text-ink"
    >
      <span className="grid h-3.5 w-3.5 shrink-0 place-content-center rounded border border-line-strong">
        {checked && <Check size={10} className="text-accent-soft" />}
      </span>
      {children}
    </button>
  );
}
