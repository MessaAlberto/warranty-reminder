export type ProductCategory = "elettrodomestici" | "elettronica" | "arredamento" | "altro";

export type WarrantyStatusKey = "healthy" | "warn" | "expiring" | "expired";

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  warrantyMonths: number;
  /** ISO date string */
  warrantyExpiration: string;
  /** Whether this receipt may be automatically archived after the warranty expires. */
  autoDelete?: boolean | undefined;
  category: ProductCategory;
}

export interface ReceiptImage {
  id: string;
  /** A local object URL or an authenticated application image endpoint. */
  url: string;
  label: string;
  driveFileId?: string | undefined;
  fileName?: string | undefined;
  mimeType?: string | undefined;
  sizeBytes?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  sortOrder?: number | undefined;
  createdAt?: string | undefined;
}

/** Client-only normalized image awaiting persistence. */
export interface PendingReceiptImage extends ReceiptImage {
  file?: File | undefined;
}

export interface Receipt {
  id: string;
  store: string;
  /** ISO date string */
  purchaseDate: string;
  notes?: string | undefined;
  images: ReceiptImage[];
  products: Product[];
  /** ISO date string */
  createdAt: string;
}

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  elettrodomestici: "Elettrodomestici",
  elettronica: "Elettronica",
  arredamento: "Arredamento",
  altro: "Altro",
};
