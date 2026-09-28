import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { STATUS_LABEL, STATUS_BG_CLASS, STATUS_TEXT_CLASS } from "@/lib/warranty";
import type { WarrantyStatusKey } from "@/lib/vault-types";

const ICONS = {
  healthy: CheckCircle2,
  warn: Clock,
  expiring: AlertTriangle,
  expired: XCircle,
} as const;

export function WarrantyStatusBadge({ status }: { status: WarrantyStatusKey }) {
  const Icon = ICONS[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${STATUS_TEXT_CLASS[status]}`}
      style={{ backgroundColor: "color-mix(in oklab, currentColor 12%, transparent)" }}
    >
      <Icon className="size-3" strokeWidth={2.4} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-wider">{STATUS_LABEL[status]}</span>
      <span className={`sr-only ${STATUS_BG_CLASS[status]}`} />
    </span>
  );
}
