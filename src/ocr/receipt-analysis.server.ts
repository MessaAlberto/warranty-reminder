import { requireAuthenticatedUser } from "../auth/auth.server";
import { extractTextFromImage } from "./vision.server";
import { extractReceiptStructure, groqReceiptModel } from "./groq-parser.server";
import type { ReceiptAnalysisResponse, ReceiptOcrImageResult } from "./ocr-types";

export type ReceiptAnalysisImage = {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
};

function mergeOcrText(images: ReceiptOcrImageResult[]): string {
  return images
    .map((image, index) => {
      if (!image.text.trim()) return "";
      return `--- RECEIPT IMAGE ${index + 1} ---\n${image.text.trim()}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function analyzeReceiptImages(
  images: ReceiptAnalysisImage[],
): Promise<ReceiptAnalysisResponse> {
  await requireAuthenticatedUser();
  if (!images.length) throw new Error("Aggiungi almeno una foto dello scontrino.");
  if (images.length > 12) throw new Error("Puoi analizzare al massimo 12 foto per scontrino.");

  const warnings: string[] = [];
  const ocrImages: ReceiptOcrImageResult[] = [];

  for (const image of images) {
    try {
      const text = await extractTextFromImage(image.bytes);
      ocrImages.push({ imageId: image.id, text });
    } catch (error) {
      if (process.env["NODE_ENV"] !== "production") {
        console.error("[receipt-analysis] Vision failed for image", image.id, error);
      }
      ocrImages.push({
        imageId: image.id,
        text: "",
        error: "OCR failed",
      });
      warnings.push("Una delle foto non è stata letta correttamente.");
    }
  }

  const rawText = mergeOcrText(ocrImages);
  if (!rawText) throw new Error("Non è stato trovato testo leggibile nelle foto dello scontrino.");

  const result = await extractReceiptStructure(rawText);
  const processedAt = new Date().toISOString();

  return {
    result,
    warnings,
    ocr: {
      status: "completed",
      processedAt,
      engine: "google-cloud-vision",
      parser: {
        provider: "groq",
        modelId: groqReceiptModel(),
      },
      rawText,
      images: ocrImages,
      extracted: result,
    },
  };
}
