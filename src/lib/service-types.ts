import type { Product, Receipt, ReceiptImage } from "./vault-types";

export interface PrototypeUser {
  name: string;
  email: string;
  initials: string;
}

export interface ReceiptAnalysis {
  store: string;
  purchaseDate: string;
  total: number;
  products: Omit<Product, "id" | "warrantyExpiration">[];
}

/** Contracts for the existing simulations; no external providers are configured. */
export interface AuthService {
  signInWithGoogle(): Promise<PrototypeUser>;
}

export interface ReceiptService {
  fetchReceipts(): Promise<Receipt[]>;
  fetchReceipt(id: string): Promise<Receipt | undefined>;
  analyseReceipt(): Promise<ReceiptAnalysis>;
  saveReceipt(receipt: Receipt): Promise<Receipt>;
  deleteReceipt(id: string): Promise<void>;
  fetchOriginalImages(receipt: Receipt): Promise<ReceiptImage[]>;
}
