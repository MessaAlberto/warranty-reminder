import receipt1 from "@/assets/receipt-1.jpg";
import receipt2 from "@/assets/receipt-2.jpg";
import { addMonths } from "./warranty";
import type { Receipt } from "./vault-types";

export const RECEIPT_IMAGES = [receipt1, receipt2];

/** ISO date `months` months before today. */
function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "r-1",
    store: "MediaWorld",
    purchaseDate: monthsAgo(1),
    total: 129.99,
    images: [{ id: "i-1", url: receipt1, label: "Pagina 1" }],
    createdAt: monthsAgo(1),
    products: [
      {
        id: "p-1",
        name: "Moulinex Easy Fry Infrared",
        model: "EZ8328",
        price: 129.99,
        warrantyMonths: 24,
        warrantyExpiration: addMonths(monthsAgo(1), 24),
        category: "elettrodomestici",
      },
    ],
  },
  {
    id: "r-2",
    store: "Apple Store",
    purchaseDate: monthsAgo(15),
    total: 1029,
    notes: "Acquistato con permuta del vecchio telefono.",
    images: [
      { id: "i-2", url: receipt1, label: "Pagina 1" },
      { id: "i-3", url: receipt2, label: "Pagina 2" },
    ],
    createdAt: monthsAgo(15),
    products: [
      {
        id: "p-2",
        name: "iPhone 16",
        model: "128 GB Blu oltremare",
        price: 979,
        warrantyMonths: 24,
        warrantyExpiration: addMonths(monthsAgo(15), 24),
        category: "elettronica",
      },
      {
        id: "p-3",
        name: "Custodia MagSafe",
        model: "Silicone",
        price: 50,
        warrantyMonths: 24,
        warrantyExpiration: addMonths(monthsAgo(15), 24),
        category: "altro",
      },
    ],
  },
  {
    id: "r-3",
    store: "Unieuro",
    purchaseDate: monthsAgo(31),
    total: 899,
    images: [{ id: "i-4", url: receipt2, label: "Pagina 1" }],
    createdAt: monthsAgo(31),
    products: [
      {
        id: "p-4",
        name: 'Samsung Smart TV 55"',
        model: "QE55Q70D",
        price: 899,
        warrantyMonths: 36,
        warrantyExpiration: addMonths(monthsAgo(31), 36),
        category: "elettronica",
      },
    ],
  },
  {
    id: "r-4",
    store: "Amazon",
    purchaseDate: monthsAgo(23),
    total: 649,
    images: [{ id: "i-5", url: receipt1, label: "Pagina 1" }],
    createdAt: monthsAgo(23),
    products: [
      {
        id: "p-5",
        name: "Dyson V15 Detect",
        model: "SV47",
        price: 649,
        warrantyMonths: 24,
        warrantyExpiration: addMonths(monthsAgo(23), 24),
        category: "elettrodomestici",
      },
    ],
  },
  {
    id: "r-5",
    store: "MediaWorld",
    purchaseDate: monthsAgo(27),
    total: 549,
    images: [{ id: "i-6", url: receipt2, label: "Pagina 1" }],
    createdAt: monthsAgo(27),
    products: [
      {
        id: "p-6",
        name: "Bosch Serie 6 lavatrice",
        model: "WGG24400IT",
        price: 549,
        warrantyMonths: 24,
        warrantyExpiration: addMonths(monthsAgo(27), 24),
        category: "elettrodomestici",
      },
    ],
  },
  {
    id: "r-6",
    store: "IKEA",
    purchaseDate: daysAgo(12),
    total: 219,
    images: [{ id: "i-7", url: receipt1, label: "Pagina 1" }],
    createdAt: daysAgo(12),
    products: [
      {
        id: "p-7",
        name: "Poltrona Strandmon",
        model: "Beige",
        price: 219,
        warrantyMonths: 60,
        warrantyExpiration: addMonths(daysAgo(12), 60),
        category: "arredamento",
      },
    ],
  },
];

export const MOCK_ANALYSIS_RESULT = {
  store: "MediaWorld",
  purchaseDate: new Date().toISOString().slice(0, 10),
  total: 129.99,
  products: [
    {
      name: "Moulinex Easy Fry Infrared",
      model: "EZ8328",
      price: 129.99,
      warrantyMonths: 24,
      category: "elettrodomestici" as const,
    },
  ],
};
