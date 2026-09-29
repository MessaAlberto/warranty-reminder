import { createServerFn } from "@tanstack/react-start";
import type { ReceiptOcrRecord } from "../ocr/ocr-types";
import type { Receipt } from "../lib/vault-types";
import * as repository from "./receipt-repository.server";

const receiptValidator = (data: Receipt) => data;
const idValidator = (data: { id: string }) => {
  if (!data.id.trim()) throw new Error("Receipt ID is required.");
  return data;
};

const autoDeleteValidator = (data: { id: string; autoDelete: boolean }) => {
  if (!data.id.trim()) throw new Error("Receipt ID is required.");
  if (typeof data.autoDelete !== "boolean") throw new Error("Auto-delete setting is invalid.");
  return data;
};

function receiptFormValidator(data: unknown): FormData {
  if (!(data instanceof FormData)) throw new Error("Receipt image data is required.");
  const receipt = data.get("receipt");
  if (typeof receipt !== "string") throw new Error("Receipt data is missing.");
  try {
    JSON.parse(receipt);
  } catch {
    throw new Error("Receipt data is invalid.");
  }
  return data;
}

function parseOcr(data: FormData): ReceiptOcrRecord | undefined {
  const raw = data.get("ocr");
  if (raw === null) return undefined;
  if (typeof raw !== "string") throw new Error("Receipt OCR data is invalid.");

  try {
    return JSON.parse(raw) as ReceiptOcrRecord;
  } catch {
    throw new Error("Receipt OCR data is invalid.");
  }
}

async function parseReceiptForm(data: FormData): Promise<{
  receipt: Receipt;
  uploads: repository.ReceiptImageUpload[];
  ocr?: ReceiptOcrRecord | undefined;
}> {
  const receipt = JSON.parse(data.get("receipt") as string) as Receipt;
  const metadata = JSON.parse((data.get("uploads") as string | null) ?? "[]") as {
    id?: unknown;
    width?: unknown;
    height?: unknown;
  }[];
  const files = data.getAll("images");
  if (!Array.isArray(metadata) || metadata.length !== files.length)
    throw new Error("Receipt image data is invalid.");

  const uploads = await Promise.all(
    files.map(async (entry, index) => {
      if (!(entry instanceof File)) throw new Error("Receipt image data is invalid.");
      const image = metadata[index];
      if (
        !image ||
        typeof image.id !== "string" ||
        typeof image.width !== "number" ||
        typeof image.height !== "number" ||
        !Number.isInteger(image.width) ||
        !Number.isInteger(image.height)
      ) {
        throw new Error("Receipt image data is invalid.");
      }
      return {
        id: image.id,
        mimeType: entry.type,
        width: image.width,
        height: image.height,
        bytes: new Uint8Array(await entry.arrayBuffer()),
      } satisfies repository.ReceiptImageUpload;
    }),
  );
  return { receipt, uploads, ocr: parseOcr(data) };
}

export const initializeStorage = createServerFn({ method: "POST" }).handler(() =>
  repository.initializeStorage(),
);
export const listReceipts = createServerFn({ method: "GET" }).handler(() =>
  repository.listReceipts(),
);
export const listTrashReceipts = createServerFn({ method: "GET" }).handler(() =>
  repository.listTrashReceipts(),
);
export const getReceipt = createServerFn({ method: "POST" })
  .validator(idValidator)
  .handler(({ data }) => repository.getReceipt(data.id));
export const createReceipt = createServerFn({ method: "POST" })
  .validator(receiptValidator)
  .handler(({ data }) => repository.createReceipt(data));
export const updateReceipt = createServerFn({ method: "POST" })
  .validator(receiptValidator)
  .handler(({ data }) => repository.updateReceipt(data));
export const createReceiptWithImages = createServerFn({ method: "POST" })
  .validator(receiptFormValidator)
  .handler(async ({ data }) => {
    const { receipt, uploads, ocr } = await parseReceiptForm(data);
    return await repository.createReceiptWithImages(receipt, uploads, ocr);
  });
export const updateReceiptWithImages = createServerFn({ method: "POST" })
  .validator(receiptFormValidator)
  .handler(async ({ data }) => {
    const { receipt, uploads, ocr } = await parseReceiptForm(data);
    return await repository.updateReceiptWithImages(receipt, uploads, ocr);
  });
export const moveReceiptToTrash = createServerFn({ method: "POST" })
  .validator(idValidator)
  .handler(({ data }) => repository.moveReceiptToTrash(data.id));
export const setReceiptAutoDelete = createServerFn({ method: "POST" })
  .validator(autoDeleteValidator)
  .handler(({ data }) => repository.setReceiptAutoDelete(data.id, data.autoDelete));
export const restoreReceipt = createServerFn({ method: "POST" })
  .validator(idValidator)
  .handler(({ data }) => repository.restoreReceipt(data.id));
export const rebuildIndex = createServerFn({ method: "POST" }).handler(() =>
  repository.rebuildIndex(),
);
