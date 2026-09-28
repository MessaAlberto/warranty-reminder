import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rise glass mx-5 rounded-2xl px-6 py-10 text-center ring-1 ring-border">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="size-6" strokeWidth={1.8} aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-lg tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-[34ch] text-[13px] text-muted-foreground">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
