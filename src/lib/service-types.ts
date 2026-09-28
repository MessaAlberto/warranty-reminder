import type { Product, Receipt, ReceiptImage } from "./vault-types";

export interface ReceiptAnalysis {
  store: string;
  purchaseDate: string;
  total: number;
  products: Omit<Product, "id" | "warrantyExpiration">[];
}

export interface ReceiptService {
  fetchReceipts(): Promise<Receipt[]>;
  fetchReceipt(id: string): Promise<Receipt | undefined>;
  analyseReceipt(): Promise<ReceiptAnalysis>;
  saveReceipt(receipt: Receipt): Promise<Receipt>;
  deleteReceipt(id: string): Promise<void>;
  fetchOriginalImages(receipt: Receipt): Promise<ReceiptImage[]>;
}
