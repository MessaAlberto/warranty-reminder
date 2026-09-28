import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sweep absolute -top-10 -right-10 h-52 w-52 rounded-full bg-accent/10 blur-2xl sm:h-72 sm:w-72" />
        <div className="sweep absolute top-40 -left-16 h-64 w-64 rounded-full bg-accent/5 blur-2xl sm:h-96 sm:w-96" />
      </div>
      <div className="relative mx-auto w-full max-w-[430px] px-0 md:max-w-3xl">{children}</div>
      {nav ? <BottomNav /> : null}
    </div>
  );
}
