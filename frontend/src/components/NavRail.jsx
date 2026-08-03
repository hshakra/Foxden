import { NavLink } from "react-router-dom";
import { LayoutGrid, Shield, Tag, Search } from "lucide-react";
import { FoxLogo } from "./FoxLogo";

const items = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/families", label: "Families", icon: Shield },
  { to: "/tags", label: "Tags", icon: Tag },
  { to: "/lookup", label: "Lookup", icon: Search },
];

export function NavRail() {
  return (
    <aside className="w-[76px] shrink-0 bg-surface-1 border-r border-line flex flex-col items-center py-4">
      <NavLink to="/" aria-label="Foxden home">
        <FoxLogo size={26} />
      </NavLink>

      <nav className="mt-5 flex w-full flex-col items-center gap-1.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex w-[58px] flex-col items-center gap-1 rounded-xl py-2 text-[9.5px] transition-colors ${
                isActive
                  ? "bg-surface-2 text-ink [&_svg]:text-accent-soft"
                  : "text-ink-3 hover:bg-surface-2/60 hover:text-ink-2"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1.5 font-mono text-[8px] tracking-wider text-ink-3">
        <span className="live-pulse h-[7px] w-[7px] rounded-full bg-good" />
        <span className="text-center leading-tight">
          FEED
          <br />
          LIVE
        </span>
      </div>
    </aside>
  );
}
