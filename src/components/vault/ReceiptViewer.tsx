import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { shareOrDownloadReceiptImage } from "@/lib/share-receipt-image";
import type { ReceiptImage } from "@/lib/vault-types";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

type Point = { x: number; y: number };
type Transform = Point & { scale: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

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
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [interacting, setInteracting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const transformRef = useRef(transform);
  const pointersRef = useRef(new Map<number, Point>());
  const panPointRef = useRef<Point | null>(null);
  const pinchRef = useRef<{
    distance: number;
    transform: Transform;
    contentPoint: Point;
  } | null>(null);
  const pointerStartRef = useRef<Point | null>(null);
  const movedRef = useRef(false);
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const image = images[index];

  const applyTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  const clampTransform = useCallback((next: Transform): Transform => {
    const stage = stageRef.current;
    const imageElement = imageRef.current;
    const scale = bounded(next.scale, MIN_SCALE, MAX_SCALE);
    if (!stage || !imageElement || scale <= 1) return { scale, x: 0, y: 0 };

    const horizontalLimit = Math.max(0, (imageElement.clientWidth * scale - stage.clientWidth) / 2);
    const verticalLimit = Math.max(0, (imageElement.clientHeight * scale - stage.clientHeight) / 2);
    return {
      scale,
      x: bounded(next.x, -horizontalLimit, horizontalLimit),
      y: bounded(next.y, -verticalLimit, verticalLimit),
    };
  }, []);

  const resetTransform = useCallback(() => {
    applyTransform({ scale: 1, x: 0, y: 0 });
    pointersRef.current.clear();
    pinchRef.current = null;
    panPointRef.current = null;
  }, [applyTransform]);

  const moveTo = useCallback(
    (nextIndex: number) => {
      setIndex(bounded(nextIndex, 0, images.length - 1));
      resetTransform();
    },
    [images.length, resetTransform],
  );

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") moveTo(index + 1);
      if (event.key === "ArrowLeft") moveTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [index, moveTo, onClose]);

  const beginPinch = () => {
    const points = [...pointersRef.current.values()];
    if (points.length !== 2 || !stageRef.current) return;
    const center = midpoint(points[0]!, points[1]!);
    const stageBounds = stageRef.current.getBoundingClientRect();
    const current = transformRef.current;
    pinchRef.current = {
      distance: distance(points[0]!, points[1]!),
      transform: current,
      contentPoint: {
        x: (center.x - (stageBounds.left + stageBounds.width / 2) - current.x) / current.scale,
        y: (center.y - (stageBounds.top + stageBounds.height / 2) - current.y) / current.scale,
      },
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    pointerStartRef.current = point;
    movedRef.current = false;
    setInteracting(true);
    if (pointersRef.current.size === 1) panPointRef.current = point;
    if (pointersRef.current.size === 2) beginPinch();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    if (pointerStartRef.current && distance(pointerStartRef.current, point) > 4)
      movedRef.current = true;

    const points = [...pointersRef.current.values()];
    if (points.length === 2 && pinchRef.current && stageRef.current) {
      event.preventDefault();
      const pinch = pinchRef.current;
      const center = midpoint(points[0]!, points[1]!);
      const stageBounds = stageRef.current.getBoundingClientRect();
      const scale = bounded(
        pinch.transform.scale * (distance(points[0]!, points[1]!) / Math.max(1, pinch.distance)),
        MIN_SCALE,
        MAX_SCALE,
      );
      applyTransform(
        clampTransform({
          scale,
          x: center.x - (stageBounds.left + stageBounds.width / 2) - pinch.contentPoint.x * scale,
          y: center.y - (stageBounds.top + stageBounds.height / 2) - pinch.contentPoint.y * scale,
        }),
      );
      return;
    }

    if (points.length === 1 && panPointRef.current && transformRef.current.scale > 1) {
      event.preventDefault();
      const previous = panPointRef.current;
      panPointRef.current = point;
      applyTransform(
        clampTransform({
          ...transformRef.current,
          x: transformRef.current.x + point.x - previous.x,
          y: transformRef.current.y + point.y - previous.y,
        }),
      );
    }
  };

  const zoomAt = (point: Point) => {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const current = transformRef.current;
    const scale = current.scale > 1 ? 1 : DOUBLE_TAP_SCALE;
    if (scale === 1) {
      applyTransform({ scale: 1, x: 0, y: 0 });
      return;
    }
    const offsetX = point.x - (bounds.left + bounds.width / 2);
    const offsetY = point.y - (bounds.top + bounds.height / 2);
    applyTransform(
      clampTransform({
        scale,
        x: offsetX - ((offsetX - current.x) / current.scale) * scale,
        y: offsetY - ((offsetY - current.y) / current.scale) * scale,
      }),
    );
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLImageElement>) => {
    const endPoint = { x: event.clientX, y: event.clientY };
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    const remaining = [...pointersRef.current.values()];
    panPointRef.current = remaining[0] ?? null;
    if (remaining.length === 1) pointerStartRef.current = remaining[0]!;

    if (remaining.length === 0) {
      setInteracting(false);
      applyTransform(clampTransform(transformRef.current));
      if (!movedRef.current && event.pointerType === "touch") {
        const now = Date.now();
        const previousTap = lastTapRef.current;
        if (
          previousTap &&
          now - previousTap.time < 300 &&
          distance(previousTap.point, endPoint) < 32
        ) {
          zoomAt(endPoint);
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, point: endPoint };
        }
      }
    }
  };

  const shareImage = async () => {
    if (!image || sharing) return;
    setSharing(true);
    try {
      const result = await shareOrDownloadReceiptImage(image);
      if (result === "downloaded") toast.success("Download dello scontrino avviato");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Impossibile salvare o condividere lo scontrino", {
        description: error instanceof Error ? error.message : "Riprova.",
      });
    } finally {
      setSharing(false);
    }
  };

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizzatore scontrino"
      className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-foreground/95 text-background"
    >
      <div className="flex shrink-0 items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <span className="font-mono text-[11px] uppercase tracking-wider">
          {image.label} · {index + 1}/{images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="grid size-10 place-items-center rounded-full ring-1 ring-background/30"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-3"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <img
          data-native-context-menu="true"
          ref={imageRef}
          src={image.url}
          alt={`Scontrino ${image.label}`}
          draggable={false}
          width={768}
          height={1536}
          className={`max-h-full max-w-full touch-none select-none rounded-xl object-contain shadow-2xl will-change-transform ${
            interacting ? "" : "transition-transform duration-200 ease-out"
          }`}
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLoad={resetTransform}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {images.length > 1 ? (
          <button
            type="button"
            onClick={() => moveTo(index - 1)}
            disabled={index === 0}
            aria-label="Immagine precedente"
            className="grid size-11 place-items-center rounded-full ring-1 ring-background/30 disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        ) : (
          <span className="size-11" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => void shareImage()}
          disabled={sharing}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-display text-[14px] ring-1 ring-background/30 disabled:opacity-50"
        >
          {sharing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          Salva o condividi
        </button>
        {images.length > 1 ? (
          <button
            type="button"
            onClick={() => moveTo(index + 1)}
            disabled={index === images.length - 1}
            aria-label="Immagine successiva"
            className="grid size-11 place-items-center rounded-full ring-1 ring-background/30 disabled:opacity-40"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        ) : (
          <span className="size-11" aria-hidden />
        )}
      </div>
    </div>
  );
}
