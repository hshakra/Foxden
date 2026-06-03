import { Link } from "react-router-dom";

export function TagChip({ tag, count }) {
  return (
    <Link to={`/tag/${tag}`}>
      <div>
        <span>{tag} </span>
        <span>{count} IOCS</span>
      </div>
    </Link>
  );
}
