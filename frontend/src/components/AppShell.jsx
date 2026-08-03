import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { NavRail } from "./NavRail";
import { LookupModal } from "./LookupModal";
import { LookupContext } from "../lib/lookup";

function isTypingTarget(el) {
  return (
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

/*
  The layout skeleton every page sits in: persistent nav rail + workspace.
  Pages render their own <TopBar/> so titles and controls stay per-view.
  "/" opens the global IOC lookup from anywhere.
*/
export function AppShell() {
  const [lookupOpen, setLookupOpen] = useState(false);
  const lookup = useMemo(
    () => ({ openLookup: () => setLookupOpen(true) }),
    [],
  );

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "/" && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        setLookupOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <LookupContext.Provider value={lookup}>
      <div className="flex h-screen overflow-hidden bg-surface-0 text-ink">
        <NavRail />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <LookupModal open={lookupOpen} onClose={() => setLookupOpen(false)} />
    </LookupContext.Provider>
  );
}
