import type { ReceiptImage } from "./vault-types";

function extensionFor(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function imageFileName(image: ReceiptImage, mimeType: string): string {
  if (image.fileName) return image.fileName;
  const label = image.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `scontrino-${label || "originale"}.${extensionFor(mimeType)}`;
}

export type ReceiptImageShareResult = "shared" | "downloaded";

export async function shareOrDownloadReceiptImage(
  image: ReceiptImage,
): Promise<ReceiptImageShareResult> {
  const response = await fetch(image.url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Impossibile recuperare l'immagine dello scontrino.");

  const blob = await response.blob();
  const mimeType = blob.type || image.mimeType || "image/jpeg";
  const file = new File([blob], imageFileName(image, mimeType), { type: mimeType });
  const shareData: ShareData = { files: [file], title: image.label };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return "shared";
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return "downloaded";
}
