import type { PendingReceiptImage } from "./vault-types";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_WIDTH = 2_000;
const MAX_HEIGHT = 8_000;
const JPEG_QUALITY = 0.9;

function normalizedSize(width: number, height: number) {
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Impossibile leggere questa immagine.");
  }
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Impossibile preparare questa immagine.");
  return blob;
}

/**
 * Normalizes camera images before upload. It respects EXIF orientation and only
 * downscales images that exceed a receipt-safe width or height limit.
 */
export async function prepareReceiptImages(files: File[]): Promise<PendingReceiptImage[]> {
  const prepared: PendingReceiptImage[] = [];

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Formato non supportato. Seleziona un'immagine JPG, PNG o WebP.");
    }
    if (file.size === 0) throw new Error("L'immagine selezionata è vuota o non leggibile.");

    const bitmap = await decodeImage(file);
    try {
      const { width, height } = normalizedSize(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossibile preparare questa immagine.");
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas);
      const normalized = new File([blob], "receipt.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      prepared.push({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(normalized),
        label: "",
        file: normalized,
        fileName: normalized.name,
        mimeType: normalized.type,
        sizeBytes: normalized.size,
        width,
        height,
      });
    } finally {
      bitmap.close();
    }
  }

  return prepared;
}

export function releaseLocalReceiptImage(image: PendingReceiptImage): void {
  if (image.file && image.url.startsWith("blob:")) URL.revokeObjectURL(image.url);
}
