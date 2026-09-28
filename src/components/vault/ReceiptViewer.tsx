import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { ReceiptImage } from "@/lib/vault-types";

export function ReceiptViewer({
  images,
  startIndex = 0,
  onClose,
}: {
  images: ReceiptImage[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const image = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizzatore scontrino"
      className="fixed inset-0 z-50 flex flex-col bg-foreground/92"
    >
      <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-background">
        <span className="font-mono text-[11px] uppercase tracking-wider">
          {image.label} · {index + 1}/{images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            aria-label="Riduci zoom"
            className="grid size-10 place-items-center rounded-full ring-1 ring-background/30"
          >
            <ZoomOut className="size-4" aria-hidden />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
            aria-label="Aumenta zoom"
            className="grid size-10 place-items-center rounded-full ring-1 ring-background/30"
          >
            <ZoomIn className="size-4" aria-hidden />
          </button>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="grid size-10 place-items-center rounded-full ring-1 ring-background/30"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        <img
          src={image.url}
          alt={`Scontrino ${image.label}`}
          loading="lazy"
          width={768}
          height={1536}
          className="mx-auto w-full max-w-md origin-top rounded-xl transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

      {images.length > 1 ? (
        <div className="flex items-center justify-between gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-background">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 ring-1 ring-background/30 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden /> Precedente
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
            disabled={index === images.length - 1}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-4 ring-1 ring-background/30 disabled:opacity-40"
          >
            Successiva <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
