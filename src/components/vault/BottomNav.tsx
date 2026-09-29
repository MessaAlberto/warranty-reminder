import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Plus, Search, Settings, Receipt } from "lucide-react";
import { useKeyboardVisibility } from "@/hooks/use-keyboard-visibility";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/search", label: "Cerca", icon: Search },
  { to: "/archive", label: "Archivio", icon: Receipt },
  { to: "/settings", label: "Opzioni", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const keyboardVisible = useKeyboardVisibility();

  return (
    <nav
      aria-label="Navigazione principale"
      className={`glass-strong fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 ring-1 ring-border transition-[transform,opacity] duration-150 md:max-w-3xl ${
        keyboardVisible
          ? "pointer-events-none translate-y-full opacity-0"
          : "translate-y-0 opacity-100"
      }`}
      aria-hidden={keyboardVisible}
    >
      <div className="relative grid grid-cols-4 px-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              tabIndex={keyboardVisible ? -1 : undefined}
              className={`flex min-h-11 touch-manipulation flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
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
          tabIndex={keyboardVisible ? -1 : undefined}
          className="absolute -top-5 left-1/2 grid size-14 -translate-x-1/2 -rotate-6 touch-manipulation place-items-center rounded-2xl bg-accent text-accent-foreground shadow-accent transition-transform duration-200 hover:rotate-0"
        >
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
