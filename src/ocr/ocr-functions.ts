import { createServerFn } from "@tanstack/react-start";
import { analyzeReceiptImages, type ReceiptAnalysisImage } from "./receipt-analysis.server";

function analysisFormValidator(data: unknown): FormData {
  if (!(data instanceof FormData)) throw new Error("Receipt image data is required.");
  const files = data.getAll("images");
  if (!files.length || files.some((entry) => !(entry instanceof File))) {
    throw new Error("Receipt image data is required.");
  }
  return data;
}

async function parseAnalysisImages(data: FormData): Promise<ReceiptAnalysisImage[]> {
  const metadata = JSON.parse((data.get("uploads") as string | null) ?? "[]") as {
    id?: unknown;
  }[];
  const files = data.getAll("images");

  if (!Array.isArray(metadata) || metadata.length !== files.length) {
    throw new Error("Receipt image data is invalid.");
  }

  return await Promise.all(
    files.map(async (entry, index) => {
      if (!(entry instanceof File)) throw new Error("Receipt image data is invalid.");
      const image = metadata[index];
      if (!image || typeof image.id !== "string" || !image.id.trim()) {
        throw new Error("Receipt image data is invalid.");
      }
      if (!entry.type.startsWith("image/")) throw new Error("Receipt image data is invalid.");
      if (entry.size === 0 || entry.size > 15 * 1024 * 1024) {
        throw new Error("Receipt image is too large.");
      }

      return {
        id: image.id,
        mimeType: entry.type,
        bytes: new Uint8Array(await entry.arrayBuffer()),
      } satisfies ReceiptAnalysisImage;
    }),
  );
}

export const analyzeReceipt = createServerFn({ method: "POST" })
  .validator(analysisFormValidator)
  .handler(async ({ data }) => analyzeReceiptImages(await parseAnalysisImages(data)));
