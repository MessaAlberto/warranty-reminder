export type ReceiptAnalysisItem = {
  name: string | null;
  price: number | null;
  quantity: number;
};

export type ReceiptAnalysisResult = {
  storeName: string | null;
  purchaseDate: string | null;
  items: ReceiptAnalysisItem[];
};

export type ReceiptOcrImageResult = {
  imageId: string;
  text: string;
  error?: string | undefined;
};

export type ReceiptOcrRecord = {
  status: "completed";
  processedAt: string;
  engine: "google-cloud-vision";
  parser: {
    provider: "groq";
    modelId: string;
  };
  rawText: string;
  images: ReceiptOcrImageResult[];
  extracted: ReceiptAnalysisResult;
};

export type ReceiptAnalysisResponse = {
  result: ReceiptAnalysisResult;
  ocr: ReceiptOcrRecord;
  warnings: string[];
};
