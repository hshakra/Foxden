import { useParams } from "react-router-dom";
import { TopBar } from "../components/TopBar";
import { EmptyState } from "../components/states";

export default function TagExplorer() {
  const { name } = useParams();
  return (
    <>
      <TopBar title={`#${name}`} subtitle="campaign tag" />
      <div className="p-5">
        <EmptyState
          title="Tag explorer is on the way"
          hint="This page lands in Phase 3 — pivot-in-place investigation."
        />
      </div>
    </>
  );
}
