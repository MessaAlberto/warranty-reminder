import { AlertTriangle, Info, TriangleAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "warn" | "expiring" | "error";

const TONE = {
  info: { icon: Info, cls: "text-accent" },
  warn: { icon: AlertTriangle, cls: "text-warn" },
  expiring: { icon: TriangleAlert, cls: "text-expiring" },
  error: { icon: XCircle, cls: "text-expired" },
} as const;

export function NoticeBanner({
  tone = "info",
  title,
  description,
  actions,
}: {
  tone?: Tone;
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
}) {
  const { icon: Icon, cls } = TONE[tone];
  return (
    <div className="glass rounded-2xl p-4 ring-1 ring-border">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-4 shrink-0 ${cls}`} strokeWidth={2.2} aria-hidden />
        <div className="min-w-0">
          <p className={`font-mono text-[10px] uppercase tracking-wider ${cls}`}>{title}</p>
          {description ? (
            <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
