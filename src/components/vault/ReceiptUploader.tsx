import { ArrowDown, ArrowUp, Camera, ImagePlus, Trash2 } from "lucide-react";
import { RECEIPT_IMAGES } from "@/lib/mock-data";
import type { ReceiptImage } from "@/lib/vault-types";
import { VaultButton } from "./controls";

export function ReceiptUploader({
  images,
  onChange,
}: {
  images: ReceiptImage[];
  onChange: (next: ReceiptImage[]) => void;
}) {
  const add = () => {
    const url = RECEIPT_IMAGES[images.length % RECEIPT_IMAGES.length] ?? RECEIPT_IMAGES[0]!;
    onChange([...images, { id: `img-${Date.now()}`, url, label: `Pagina ${images.length + 1}` }]);
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    onChange(next.map((img, i) => ({ ...img, label: `Pagina ${i + 1}` })));
  };

  const remove = (id: string) =>
    onChange(
      images.filter((i) => i.id !== id).map((img, i) => ({ ...img, label: `Pagina ${i + 1}` })),
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <VaultButton variant="accent" onClick={add}>
          <Camera className="size-4" aria-hidden /> Scatta foto
        </VaultButton>
        <VaultButton variant="outline" onClick={add}>
          <ImagePlus className="size-4" aria-hidden /> Dalla galleria
        </VaultButton>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Uno scontrino può richiedere più foto: aggiungi tutte le pagine necessarie, anche
        parzialmente sovrapposte.
      </p>

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <p className="font-display text-[15px]">Nessuna foto aggiunta</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Inquadra lo scontrino su una superficie piana.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {images.map((img, i) => (
            <li
              key={img.id}
              className="glass flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-border"
            >
              <img
                src={img.url}
                alt={`Anteprima ${img.label}`}
                loading="lazy"
                width={768}
                height={1536}
                className="h-16 w-12 shrink-0 rounded-lg object-cover object-top"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] tracking-tight">{img.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Scontrino · foto {i + 1} di {images.length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  aria-label={`Sposta ${img.label} su`}
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-border"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  aria-label={`Sposta ${img.label} giù`}
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-border"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  onClick={() => remove(img.id)}
                  aria-label={`Rimuovi ${img.label}`}
                  className="grid size-10 place-items-center rounded-xl text-expired ring-1 ring-border"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 ? (
        <VaultButton variant="outline" onClick={add} className="w-full">
          <ImagePlus className="size-4" aria-hidden /> Aggiungi un'altra pagina
        </VaultButton>
      ) : null}
    </div>
  );
}
