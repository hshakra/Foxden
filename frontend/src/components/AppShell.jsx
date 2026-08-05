import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NavRail } from "./NavRail";
import { LookupModal } from "./LookupModal";
import { LookupContext } from "../lib/lookup";

function isTypingTarget(el) {
  return (
    el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
}

// the layout skeleton every page sits in, nav rail plus workspace
// pages render their own TopBar so titles and controls stay per view
// pressing / opens the global ioc lookup from anywhere
export function AppShell() {
  const [lookupOpen, setLookupOpen] = useState(false);
  const mainRef = useRef(null);
  const { pathname } = useLocation();

  // every page starts at its own top, the workspace pane is the
  // scroll container so the browser never resets it for us
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);
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
      // the shortcut every tool answers to, alongside the / key
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLookupOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <LookupContext.Provider value={lookup}>
      <div className="flex h-screen overflow-hidden bg-bg text-ink">
        <NavRail />
        <main
          ref={mainRef}
          className="flex min-w-0 flex-1 flex-col overflow-y-auto"
        >
          <Outlet />
        </main>
      </div>
      <LookupModal open={lookupOpen} onClose={() => setLookupOpen(false)} />
    </LookupContext.Provider>
  );
}
