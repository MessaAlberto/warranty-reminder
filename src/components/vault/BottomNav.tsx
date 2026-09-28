import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Search, Settings, Receipt } from "lucide-react";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Cerca", icon: Search },
  { to: "/archive", label: "Archivio", icon: Receipt },
  { to: "/settings", label: "Opzioni", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navigazione principale"
      className="glass-strong fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 ring-1 ring-border md:max-w-3xl"
    >
      <div className="relative grid grid-cols-4 px-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-h-11 flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
        <Link
          to="/add"
          aria-label="Aggiungi acquisto"
          className="absolute -top-5 left-1/2 grid size-14 -translate-x-1/2 -rotate-6 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-accent transition-transform duration-200 hover:rotate-0"
        >
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
