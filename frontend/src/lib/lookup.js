import { createContext, useContext } from "react";

export const LookupContext = createContext(null);

export function useLookup() {
  const ctx = useContext(LookupContext);
  if (!ctx) throw new Error("useLookup must be used inside AppShell");
  return ctx;
}
