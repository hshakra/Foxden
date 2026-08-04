import { Link } from "react-router-dom";

// the one chip, a small clickable value that filters or navigates
// pass to for navigation, onClick for actions
export function Chip({ to, onClick, onMouseEnter, title, children }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-md border border-line bg-lifted px-2 py-1 text-secondary text-ink-mid transition-colors duration-150 hover:border-line-strong hover:text-ink";

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        title={title}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={title}
      className={className}
    >
      {children}
    </button>
  );
}
