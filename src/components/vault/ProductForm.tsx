import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { CATEGORY_LABEL, type Product, type ProductCategory } from "@/lib/vault-types";
import { addMonths, formatDate, formatPrice } from "@/lib/warranty";
import { Field, TextInput } from "./controls";

const DURATIONS = [24, 36, 48, 60] as const;

export function ProductForm({
  product,
  purchaseDate,
  index,
  onChange,
  onRemove,
  defaultOpen,
}: {
  product: Product;
  purchaseDate: string;
  index: number;
  onChange: (next: Product) => void;
  onRemove?: (() => void) | undefined;
  defaultOpen?: boolean | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen ?? index === 0);
  const custom = !DURATIONS.includes(product.warrantyMonths as (typeof DURATIONS)[number]);

  const set = (patch: Partial<Product>) => onChange({ ...product, ...patch });

  const setMonths = (months: number) =>
    set({ warrantyMonths: months, warrantyExpiration: addMonths(purchaseDate, months) });

  return (
    <div className="glass rounded-2xl ring-1 ring-border">
      <div className="flex items-center gap-2 p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/10 font-mono text-[11px] text-accent">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[15px] tracking-tight">
              {product.name || "Nuovo prodotto"}
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatPrice(product.price)} · {product.warrantyMonths} mesi
            </span>
          </span>
          <ChevronDown
            className={`ml-auto size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {onRemove ? (
          <button
            onClick={onRemove}
            aria-label={`Rimuovi ${product.name || "prodotto"}`}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-expired ring-1 ring-border"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="space-y-4 border-t border-border p-4">
          <Field label="Nome prodotto">
            {(id) => (
              <TextInput
                id={id}
                value={product.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo (€)">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={product.price}
                  onChange={(e) => set({ price: Math.max(0, Number(e.target.value) || 0) })}
                />
              )}
            </Field>
            <Field label="Quantità">
              {(id) => (
                <TextInput
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={product.quantity}
                  onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
              )}
            </Field>
          </div>

          <Field label="Categoria">
            {(id) => (
              <select
                id={id}
                value={product.category}
                onChange={(e) => set({ category: e.target.value as ProductCategory })}
                className="min-h-12 w-full rounded-xl bg-background/60 px-3 text-[15px] ring-1 ring-border outline-none focus:ring-accent"
              >
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Durata garanzia
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  aria-pressed={!custom && product.warrantyMonths === m}
                  className={`min-h-10 rounded-full px-4 font-mono text-[11px] tracking-wider ${
                    !custom && product.warrantyMonths === m
                      ? "bg-foreground text-background"
                      : "ring-1 ring-border text-muted-foreground"
                  }`}
                >
                  {m} mesi
                </button>
              ))}
              <button
                onClick={() => set({ warrantyMonths: 0 })}
                aria-pressed={custom}
                className={`min-h-10 rounded-full px-4 font-mono text-[11px] tracking-wider ${
                  custom
                    ? "bg-foreground text-background"
                    : "ring-1 ring-border text-muted-foreground"
                }`}
              >
                Data personalizzata
              </button>
            </div>
          </div>

          {custom ? (
            <Field label="Scadenza personalizzata">
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={product.warrantyExpiration}
                  onChange={(e) => set({ warrantyExpiration: e.target.value })}
                />
              )}
            </Field>
          ) : null}

          <p className="rounded-xl bg-accent/8 px-3 py-2.5 text-[13px]">
            Scadenza garanzia:{" "}
            <span className="font-medium">{formatDate(product.warrantyExpiration)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
