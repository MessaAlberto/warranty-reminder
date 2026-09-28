import type { Product, Receipt, WarrantyStatusKey } from "./vault-types";

const DAY = 1000 * 60 * 60 * 24;

export function addMonths(iso: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";

  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";

  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function daysLeft(expiration: string, now = new Date()): number {
  const end = new Date(expiration).getTime();
  const start = new Date(now.toISOString().slice(0, 10)).getTime();
  return Math.round((end - start) / DAY);
}

export function statusOf(product: Product, now = new Date()): WarrantyStatusKey {
  const d = daysLeft(product.warrantyExpiration, now);
  if (d <= 0) return "expired";
  if (d <= 30) return "expiring";
  if (d <= 183) return "warn";
  return "healthy";
}

export const STATUS_LABEL: Record<WarrantyStatusKey, string> = {
  healthy: "Attiva",
  warn: "Meno di 6 mesi",
  expiring: "In scadenza",
  expired: "Scaduta",
};

export const STATUS_TEXT_CLASS: Record<WarrantyStatusKey, string> = {
  healthy: "text-healthy",
  warn: "text-warn",
  expiring: "text-expiring",
  expired: "text-expired",
};

export const STATUS_BG_CLASS: Record<WarrantyStatusKey, string> = {
  healthy: "bg-healthy",
  warn: "bg-warn",
  expiring: "bg-expiring",
  expired: "bg-expired",
};

/** Fraction of the warranty still remaining, 0..1 */
export function progressOf(product: Product, purchaseDate: string, now = new Date()): number {
  const start = new Date(purchaseDate).getTime();
  const end = new Date(product.warrantyExpiration).getTime();
  if (end <= start) return 0;
  const left = (end - now.getTime()) / (end - start);
  return Math.min(1, Math.max(0, left));
}

export function remainingText(expiration: string, now = new Date()): string {
  const d = daysLeft(expiration, now);
  if (d <= 0) return "Garanzia terminata";
  if (d < 45) return `${d} ${d === 1 ? "giorno" : "giorni"} rimanenti`;
  const months = Math.floor(d / 30.44);
  if (months < 12) return `${months} mesi rimanenti`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = `${years} ${years === 1 ? "anno" : "anni"}`;
  return rest === 0 ? `${y} rimanenti` : `${y} e ${rest} ${rest === 1 ? "mese" : "mesi"} rimanenti`;
}

export function deletionText(expiration: string, now = new Date()): string {
  const gone = -daysLeft(expiration, now);
  const left = 90 - gone;
  if (left <= 0) return "In attesa di eliminazione";
  return `Eliminazione prevista tra ${left} giorni`;
}

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const shortFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
};
export const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : shortFmt.format(date);
};
export const formatPrice = (n: number) => euro.format(n);

export function receiptStatus(receipt: Receipt, now = new Date()): WarrantyStatusKey {
  const order: WarrantyStatusKey[] = ["expired", "expiring", "warn", "healthy"];
  const found = receipt.products.map((p) => statusOf(p, now));
  return order.find((s) => found.includes(s)) ?? "healthy";
}

export function primaryProduct(receipt: Receipt): Product | undefined {
  return receipt.products[0];
}
