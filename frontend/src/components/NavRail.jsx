import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, List, Shield, Tag, Search } from "lucide-react";
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

const rowClass = (active) =>
  `flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
    active
      ? "bg-surface-2 font-medium text-ink"
      : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
  }`;

export function NavRail() {
  const { openLookup } = useLookup();
  const { pathname } = useLocation();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-line bg-surface-1 px-3 py-4">
      <NavLink
        to="/"
        aria-label="Foxden home"
        className="mb-5 flex items-center gap-2.5 px-2"
      >
        <FoxLogo size={22} />
        <span className="text-[15px] font-bold tracking-tight">Foxden</span>
      </NavLink>

      <nav className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[11px] font-medium text-ink-3">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, match }) => (
                <NavLink key={to} to={to} className={rowClass(match(pathname))}>
                  <Icon size={15} strokeWidth={2} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="mb-1 px-2.5 text-[11px] font-medium text-ink-3">
            Tools
          </p>
          <button type="button" onClick={openLookup} className={rowClass(false)}>
            <Search size={15} strokeWidth={2} />
            Lookup
            <kbd className="ml-auto rounded border border-line-2 px-1.5 font-mono text-[10px] text-ink-3">
              /
            </kbd>
          </button>
        </div>
      </nav>

      <div className="mt-auto border-t border-line px-2.5 pt-3 text-[11px] leading-relaxed text-ink-3">
        <p className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          Live feed
        </p>
        <p>Data: ThreatFox by abuse.ch</p>
      </div>
    </aside>
  );
}
