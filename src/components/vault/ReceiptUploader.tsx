import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { prepareReceiptImages, releaseLocalReceiptImage } from "@/lib/receipt-image-preprocessing";
import type { PendingReceiptImage } from "@/lib/vault-types";
import { VaultButton } from "./controls";

export function ReceiptUploader({
  images,
  onChange,
  disabled = false,
}: {
  images: PendingReceiptImage[];
  onChange: (next: PendingReceiptImage[]) => void;
  disabled?: boolean;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const itemElements = useRef(new Map<string, HTMLLIElement>());
  const previousPositions = useRef(new Map<string, DOMRect>());
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>();
    for (const image of images) {
      const element = itemElements.current.get(image.id);
      if (!element) continue;
      const next = element.getBoundingClientRect();
      const previous = previousPositions.current.get(image.id);
      nextPositions.set(image.id, next);
      if (
        previous &&
        previous.top !== next.top &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        element.animate(
          [
            { transform: `translateY(${previous.top - next.top}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 220, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
        );
      }
    }
    previousPositions.current = nextPositions;
  }, [images]);

  const relabel = (next: PendingReceiptImage[]) =>
    next.map((image, index) => ({
      ...image,
      label: `Pagina ${index + 1}`,
      sortOrder: index + 1,
    }));

  const select = async (files: FileList | null) => {
    if (!files?.length) return;
    setPreparing(true);
    setError(null);
    try {
      onChange(relabel([...images, ...(await prepareReceiptImages(Array.from(files)))]));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile preparare l'immagine.");
    } finally {
      setPreparing(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(relabel(next));
  };

  const remove = (image: PendingReceiptImage) => {
    releaseLocalReceiptImage(image);
    onChange(relabel(images.filter((entry) => entry.id !== image.id)));
  };

  return (
    <div className="space-y-4">
      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          void select(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          void select(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <VaultButton
          variant="accent"
          disabled={disabled || preparing}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera className="size-4" aria-hidden /> Scatta foto
        </VaultButton>
        <VaultButton
          variant="outline"
          disabled={disabled || preparing}
          onClick={() => galleryInput.current?.click()}
        >
          <ImagePlus className="size-4" aria-hidden /> Dalla galleria
        </VaultButton>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Uno scontrino può richiedere più foto: aggiungi tutte le pagine necessarie, anche
        parzialmente sovrapposte.
      </p>

      {preparing ? (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Preparazione immagini…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] text-expired">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <p className="font-display text-[15px]">Nessuna foto aggiunta</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Inquadra lo scontrino su una superficie piana.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              ref={(element) => {
                if (element) itemElements.current.set(image.id, element);
                else itemElements.current.delete(image.id);
              }}
              className="glass flex items-center gap-3 rounded-2xl p-2.5 ring-1 ring-border"
            >
              <img
                data-native-context-menu="true"
                src={image.url}
                alt={`Anteprima ${image.label}`}
                loading="lazy"
                width={768}
                height={1536}
                className="h-16 w-12 shrink-0 rounded-lg object-cover object-top"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] tracking-tight">{image.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Scontrino · foto {index + 1} di {images.length}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  disabled={disabled || preparing || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Sposta ${image.label} su`}
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-border disabled:opacity-40"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  disabled={disabled || preparing || index === images.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Sposta ${image.label} giù`}
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground ring-1 ring-border disabled:opacity-40"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  disabled={disabled || preparing}
                  onClick={() => remove(image)}
                  aria-label={`Rimuovi ${image.label}`}
                  className="grid size-10 place-items-center rounded-xl text-expired ring-1 ring-border disabled:opacity-40"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 ? (
        <VaultButton
          variant="outline"
          disabled={disabled || preparing}
          onClick={() => galleryInput.current?.click()}
          className="w-full"
        >
          <ImagePlus className="size-4" aria-hidden /> Aggiungi un'altra pagina
        </VaultButton>
      ) : null}
    </div>
  );
}
