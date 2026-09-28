import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  action,
  back,
}: {
  eyebrow?: string | undefined;
  title: string;
  action?: ReactNode;
  back?: string | undefined;
}) {
  return (
    <header className="rise relative z-10 flex items-start justify-between gap-3 px-5 pt-6 pb-4">
      <div className="flex min-w-0 items-start gap-2">
        {back ? (
          <Link
            to={back}
            aria-label="Indietro"
            className="glass mt-1 grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-border"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 font-display text-[28px] leading-none tracking-tight">{title}</h1>
        </div>
      </div>
      {action}
    </header>
  );
}
