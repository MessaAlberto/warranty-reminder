import { Link } from "@tanstack/react-router";
import type { Receipt } from "@/lib/vault-types";
import {
  deletionText,
  formatPrice,
  formatShortDate,
  progressOf,
  remainingText,
  statusOf,
} from "@/lib/warranty";
import { WarrantyProgress } from "./WarrantyProgress";
import { WarrantyStatusBadge } from "./WarrantyStatusBadge";

export function WarrantyCard({ receipt, delay = 0 }: { receipt: Receipt; delay?: number }) {
  const product = receipt.products[0];
  if (!product) return null;
  const status = statusOf(product);
  const extra = receipt.products.length - 1;

  return (
    <Link
      to="/purchase/$id"
      params={{ id: receipt.id }}
      className="rise glass block rounded-2xl p-4 ring-1 ring-border transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[17px] font-medium tracking-tight">
            {product.name}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {receipt.store} · <span className="font-mono">{formatPrice(product.price)}</span>
          </p>
        </div>
        <WarrantyStatusBadge status={status} />
      </div>

      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        {status === "expired" ? (
          <>
            Scaduta il {formatShortDate(product.warrantyExpiration)} ·{" "}
            <span className="font-medium text-foreground">
              {deletionText(product.warrantyExpiration)}
            </span>
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">
              {remainingText(product.warrantyExpiration)}
            </span>{" "}
            · acquisto {formatShortDate(receipt.purchaseDate)} · scade il{" "}
            {formatShortDate(product.warrantyExpiration)}
          </>
        )}
      </p>

      <WarrantyProgress
        value={progressOf(product, receipt.purchaseDate)}
        status={status}
        label={`Garanzia ${product.name}: ${remainingText(product.warrantyExpiration)}`}
      />

      {extra > 0 ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          + altri {extra} prodotti su questo scontrino
        </p>
      ) : null}
    </Link>
  );
}
