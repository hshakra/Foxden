import { createContext, useContext } from "react";

export const RangeContext = createContext(null);

// ThreatFox caps get_iocs at 7 days, so 7d is the widest range
export const RANGES = [
  { days: 1, label: "24h" },
  { days: 3, label: "3d" },
  { days: 7, label: "7d" },
];

export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside RangeProvider");
  return ctx;
}
