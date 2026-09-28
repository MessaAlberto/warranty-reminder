export type ProductCategory = "elettrodomestici" | "elettronica" | "arredamento" | "altro";

export type WarrantyStatusKey = "healthy" | "warn" | "expiring" | "expired";

export interface Product {
  id: string;
  name: string;
  model?: string | undefined;
  price: number;
  warrantyMonths: number;
  /** ISO date string */
  warrantyExpiration: string;
  category: ProductCategory;
}

export interface ReceiptImage {
  id: string;
  /** URL of the mock scan */
  url: string;
  label: string;
}

export interface Receipt {
  id: string;
  store: string;
  /** ISO date string */
  purchaseDate: string;
  total: number;
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
