import { STATUS_BG_CLASS } from "@/lib/warranty";
import type { WarrantyStatusKey } from "@/lib/vault-types";

export function WarrantyProgress({
  value,
  status,
  label,
}: {
  /** 0..1 remaining */
  value: number;
  status: WarrantyStatusKey;
  label: string;
}) {
  return (
    <div
      className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/8"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${STATUS_BG_CLASS[status]}`}
        style={{ width: `${Math.max(value * 100, value > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}
