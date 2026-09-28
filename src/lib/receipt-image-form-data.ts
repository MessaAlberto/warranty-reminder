import type { ReceiptOcrRecord } from "../ocr/ocr-types";
import type { PendingReceiptImage, Receipt } from "./vault-types";

type ReceiptWithPendingImages = Omit<Receipt, "images"> & { images: PendingReceiptImage[] };

function serializableImage(image: PendingReceiptImage) {
  const { file: _file, ...value } = image;
  return value;
}

function localImages(images: PendingReceiptImage[]): PendingReceiptImage[] {
  return images.filter((image) => image.file);
}

function appendUploads(formData: FormData, images: PendingReceiptImage[]): void {
  const uploads = localImages(images);
  formData.set(
    "uploads",
    JSON.stringify(
      uploads.map((image) => ({
        id: image.id,
        width: image.width,
        height: image.height,
      })),
    ),
  );
  for (const image of uploads) formData.append("images", image.file!);
}

/** Packages normalized local images for the OCR + structured extraction step. */
export function receiptAnalysisFormData(images: PendingReceiptImage[]): FormData {
  const formData = new FormData();
  appendUploads(formData, images);
  return formData;
}

/** Packages receipt metadata and only local, preprocessed files for persistence. */
export function receiptImageFormData(
  receipt: ReceiptWithPendingImages,
  ocr?: ReceiptOcrRecord,
): FormData {
  const formData = new FormData();
  formData.set(
    "receipt",
    JSON.stringify({ ...receipt, images: receipt.images.map(serializableImage) }),
  );
  if (ocr) formData.set("ocr", JSON.stringify(ocr));
  appendUploads(formData, receipt.images);
  return formData;
}
