import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, List, Shield, Tag, Search, Info } from "lucide-react";
import { FoxLogo } from "./FoxLogo";
import { useLookup } from "../lib/lookup";

// the sidebar, grouped text navigation like a real product
const groups = [
  {
    label: "Monitor",
    items: [
      { to: "/", label: "Overview", icon: LayoutGrid, match: (p) => p === "/" },
      {
        to: "/iocs",
        label: "IOCs",
        icon: List,
        match: (p) => p.startsWith("/iocs"),
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        to: "/families",
        label: "Families",
        icon: Shield,
        // stays lit inside /family/:name too
        match: (p) => p.startsWith("/famil"),
      },
      {
        to: "/tags",
        label: "Tags",
        icon: Tag,
        match: (p) => p.startsWith("/tag"),
      },
    ],
  },
];

// active rows sit on a lifted surface behind a 2px accent edge
const rowClass = (active) =>
  `flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-body transition-colors duration-150 ${
    active
      ? "bg-lifted font-medium text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
      : "text-ink-mid hover:bg-lifted/60 hover:text-ink"
  }`;

export function NavRail() {
  const { openLookup } = useLookup();
  const { pathname } = useLocation();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-raised px-3 py-4">
      {/* the wordmark is the way back to the story */}
      <NavLink
        to="/about"
        aria-label="About Foxden"
        title="About Foxden"
        className="mb-6 flex items-center gap-2.5 px-2"
      >
        <FoxLogo size={22} />
        <span className="text-[15px] font-medium tracking-tight">Foxden</span>
      </NavLink>
      <p className="-mt-4 mb-6 px-2 text-meta leading-snug text-ink-low">
        Live threat intel from the ThreatFox feed
      </p>

      <nav className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-meta font-medium text-ink-low">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, match }) => (
                <NavLink key={to} to={to} className={rowClass(match(pathname))}>
                  <Icon size={15} strokeWidth={1.5} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="mb-1 px-2.5 text-meta font-medium text-ink-low">
            Tools
          </p>
          <button type="button" onClick={openLookup} className={rowClass(false)}>
            <Search size={15} strokeWidth={1.5} />
            Lookup
            <kbd className="ml-auto rounded border border-line-strong px-1.5 font-mono text-meta text-ink-low">
              /
            </kbd>
          </button>
        </div>
      </nav>

      {/* pinned below the workflow, the way products park help and settings */}
      <div className="mt-auto">
        <NavLink to="/about" className={rowClass(pathname === "/about")}>
          <Info size={15} strokeWidth={1.5} />
          About Foxden
        </NavLink>
      </div>
      <div className="mt-3 border-t border-line px-2.5 pt-3 text-meta leading-relaxed text-ink-low">
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live feed
        </p>
        <p>Data: ThreatFox by abuse.ch</p>
      </div>
    </aside>
  );
}
