import { createContext, useContext } from "react";

export const RangeContext = createContext(null);

export const RANGES = [
  { days: 1, label: "24h" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
];

export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error("useRange must be used inside RangeProvider");
  return ctx;
}
