import { Outlet } from "react-router-dom";
import { NavRail } from "./NavRail";

/*
  The layout skeleton every page sits in: persistent nav rail + workspace.
  Pages render their own <TopBar/> so titles and controls stay per-view.
*/
export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-0 text-ink">
      <NavRail />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
