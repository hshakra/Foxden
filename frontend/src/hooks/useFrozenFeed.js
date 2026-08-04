import { useMemo, useState } from "react";

// background refetches should not shift the page while someone reads it
// hold the applied snapshot steady, count what arrived, and let the user
// pull the new data in with the refresh pill
// windowKey changes on a range switch, which applies the new window at once
export default function useFrozenFeed(latest, windowKey) {
  const [applied, setApplied] = useState(null);
  const [lastKey, setLastKey] = useState(windowKey);

  // adjust during render instead of an effect, guarded so it settles
  if (windowKey !== lastKey) {
    setLastKey(windowKey);
    setApplied(latest ?? null);
  } else if (latest && applied === null) {
    setApplied(latest);
  }

  const appliedIds = useMemo(
    () => new Set((applied?.current ?? []).map((ioc) => ioc.id)),
    [applied],
  );

  let pendingCount = 0;
  if (latest && applied && latest !== applied) {
    for (const ioc of latest.current ?? []) {
      if (!appliedIds.has(ioc.id)) pendingCount += 1;
    }
  }

  return {
    data: applied ?? latest,
    pendingCount,
    refresh: () => setApplied(latest),
  };
}
