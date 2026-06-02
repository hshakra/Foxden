import { Link } from "react-router-dom";

export function FamilyCard({ name, count }) {
  return (
    <Link to={`/family/${name}`}>
      <div>
        <span>{name} </span>
        <span>{count} IOCS</span>
      </div>
    </Link>
  );
}
