import { randomUUID } from "node:crypto";

import { requireAuthenticatedUser } from "../auth/auth.server";
import type { ReceiptOcrRecord } from "../ocr/ocr-types";
import type { ProductCategory, Receipt } from "../lib/vault-types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const JSON_MIME_TYPE = "application/json";

type DriveConfig = {
  rootFolderId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
};
type Attachment = {
  id: string;
  driveFileId: string;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: string;
};
export type ReceiptImageUpload = {
  id: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: Uint8Array;
};
type StoredItem = {
  id: string;
  name: string;
  brand: string | null;
  serialNumber: string | null;
  quantity: number;
  price: number;
  warrantyStartDate: string;
  warrantyMonths: number;
  warrantyEndDate: string;
  autoDelete: boolean;
  notes: string | null;
  category: ProductCategory;
};
type StoredReceipt = {
  id: string;
  storeName: string;
  purchaseDate: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  trashedAt?: string | null;
  createdBy: string;
  status: "active" | "trash";
  notes: string | null;
  ocr: ReceiptOcrRecord | null;
  items: StoredItem[];
  attachments: Attachment[];
};
type IndexEntry = Pick<
  StoredReceipt,
  "id" | "storeName" | "purchaseDate" | "currency" | "createdAt" | "updatedAt" | "status"
> & {
  notes: string | null;
  items: Pick<
    StoredItem,
    | "id"
    | "name"
    | "quantity"
    | "price"
    | "warrantyEndDate"
    | "warrantyMonths"
    | "autoDelete"
    | "category"
  >[];
};
type IndexDocument = { version: 1; updatedAt: string; receipts: IndexEntry[] };
type Storage = { receiptsFolderId: string; trashFolderId: string; indexFileId: string };

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Drive storage is not configured.");
  return value;
}

function config(): DriveConfig {
  return {
    rootFolderId: requiredEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID"),
    refreshToken: requiredEnv("GOOGLE_DRIVE_REFRESH_TOKEN"),
    clientId: requiredEnv("GOOGLE_AUTH_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_AUTH_CLIENT_SECRET"),
  };
}

async function accessToken() {
  const c = config();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: c.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Google Drive is unavailable. Try again shortly.");
  const body = (await response.json()) as { access_token?: unknown };
  if (typeof body.access_token !== "string")
    throw new Error("Google Drive authorization could not be refreshed.");
  return body.access_token;
}

function headers(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` };
}
function escapeQuery(value: string) {
  return value.replace(/'/g, "\\'");
}
function now() {
  return new Date().toISOString();
}

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_ARCHIVE_AFTER_DAYS = 90;
const TRASH_GRACE_DAYS = 30;

function isoDateToUtcMs(value: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const result = Date.UTC(year, month - 1, day);
  const date = new Date(result);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return result;
}

function daysSinceDate(value: string, todayIso: string): number | undefined {
  const start = isoDateToUtcMs(value);
  const end = isoDateToUtcMs(todayIso);
  if (start === undefined || end === undefined) return undefined;
  return Math.floor((end - start) / DAY_MS);
}

function latestWarrantyEndDate(
  items: Array<Pick<StoredItem, "warrantyEndDate">>,
): string | undefined {
  if (!items.length) return undefined;
  const dates = items.map((item) => item.warrantyEndDate);
  if (dates.some((value) => isoDateToUtcMs(value) === undefined)) return undefined;
  return dates.sort().at(-1);
}

function shouldAutoArchiveReceipt(receipt: StoredReceipt, todayIso: string): boolean {
  if (receipt.status !== "active" || !receipt.items.length) return false;
  if (receipt.items.some((item) => item.autoDelete === false)) return false;
  const latestExpiration = latestWarrantyEndDate(receipt.items);
  if (!latestExpiration) return false;
  const daysExpired = daysSinceDate(latestExpiration, todayIso);
  return daysExpired !== undefined && daysExpired >= AUTO_ARCHIVE_AFTER_DAYS;
}

function indexEntryCouldAutoArchive(entry: IndexEntry, todayIso: string): boolean {
  if (entry.status !== "active" || !entry.items.length) return false;
  if (entry.items.some((item) => item.autoDelete === false)) return false;
  const latestExpiration = latestWarrantyEndDate(entry.items);
  if (!latestExpiration) return false;
  const daysExpired = daysSinceDate(latestExpiration, todayIso);
  return daysExpired !== undefined && daysExpired >= AUTO_ARCHIVE_AFTER_DAYS;
}

async function listFiles(token: string, query: string) {
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name,mimeType,parents)");
  const response = await fetch(url, { headers: headers(token) });
  if (!response.ok) throw new Error("Google Drive could not list metadata.");
  const body = (await response.json()) as {
    files?: { id?: string; name?: string; mimeType?: string; parents?: string[] }[];
  };
  return body.files ?? [];
}

async function createFolder(token: string, name: string, parent: string) {
  const response = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME_TYPE, parents: [parent] }),
  });
  if (!response.ok) throw new Error("Google Drive could not initialize storage.");
  const body = (await response.json()) as { id?: string };
  if (!body.id) throw new Error("Google Drive did not return a folder ID.");
  return body.id;
}

async function findOrCreateFolder(token: string, name: string, parent: string) {
  const files = await listFiles(
    token,
    `'${escapeQuery(parent)}' in parents and name = '${escapeQuery(name)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  );
  return files[0]?.id ?? createFolder(token, name, parent);
}

async function createJson(token: string, name: string, parent: string, value: unknown) {
  const boundary = `warranty-${randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ name, mimeType: JSON_MIME_TYPE, parents: [parent] }),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(value),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const response = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { ...headers(token), "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error("Google Drive could not write metadata.");
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error("Google Drive did not return a metadata ID.");
  return result.id;
}

async function readJson<T>(token: string, fileId: string): Promise<T> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: headers(token),
  });
  if (!response.ok) throw new Error("Google Drive could not read metadata.");
  return (await response.json()) as T;
}

async function writeJson(token: string, fileId: string, value: unknown) {
  const response = await fetch(`${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: "PATCH",
    headers: { ...headers(token), "content-type": JSON_MIME_TYPE },
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error("Google Drive could not update metadata.");
}

function supportedImageType(value: string): boolean {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

function imageFileName(attachments: Attachment[]): string {
  const highest = attachments.reduce((max, attachment) => {
    const match = /^receipt_(\d+)\.(?:jpg|jpeg|png|webp)$/i.exec(attachment.fileName);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `receipt_${String(highest + 1).padStart(3, "0")}.jpg`;
}

async function uploadImage(
  token: string,
  folderId: string,
  fileName: string,
  image: ReceiptImageUpload,
): Promise<string> {
  if (
    !supportedImageType(image.mimeType) ||
    image.bytes.byteLength === 0 ||
    image.bytes.byteLength > 15 * 1024 * 1024 ||
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1
  ) {
    throw new Error("Image upload data is invalid.");
  }
  const boundary = `warranty-image-${randomUUID()}`;
  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: fileName, mimeType: image.mimeType, parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: ${image.mimeType}\r\n\r\n`,
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, Buffer.from(image.bytes), suffix]);
  const response = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { ...headers(token), "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error("Google Drive could not upload the receipt image.");
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error("Google Drive did not return the uploaded image ID.");
  return result.id;
}

async function moveImageToDriveTrash(token: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!response.ok) throw new Error("Google Drive could not remove the receipt image.");
}

async function persistImages(
  token: string,
  folderId: string,
  receiptFileId: string,
  stored: StoredReceipt,
  requestedImages: { id: string; sortOrder?: number | undefined }[],
  uploads: ReceiptImageUpload[],
): Promise<void> {
  const requestedIds = requestedImages.map((image) => image.id);
  if (new Set(requestedIds).size !== requestedIds.length)
    throw new Error("Receipt images are invalid.");
  const existingById = new Map(stored.attachments.map((attachment) => [attachment.id, attachment]));
  const uploadIds = new Set(uploads.map((upload) => upload.id));
  if (
    uploadIds.size !== uploads.length ||
    uploads.some((upload) => !requestedIds.includes(upload.id))
  ) {
    throw new Error("Receipt image data is invalid.");
  }
  for (const image of requestedImages) {
    if (!existingById.has(image.id) && !uploadIds.has(image.id)) {
      throw new Error("Receipt image does not belong to this receipt.");
    }
  }

  for (const upload of uploads) {
    if (existingById.has(upload.id)) continue;
    const fileName = imageFileName(stored.attachments);
    const driveFileId = await uploadImage(token, folderId, fileName, upload);
    stored.attachments.push({
      id: upload.id,
      driveFileId,
      fileName,
      mimeType: upload.mimeType,
      sizeBytes: upload.bytes.byteLength,
      width: upload.width,
      height: upload.height,
      sortOrder: requestedIds.indexOf(upload.id) + 1,
      createdAt: now(),
    });
    await writeJson(token, receiptFileId, stored);
  }

  for (const attachment of [...stored.attachments]) {
    if (requestedIds.includes(attachment.id)) continue;
    await moveImageToDriveTrash(token, attachment.driveFileId);
    stored.attachments = stored.attachments.filter((entry) => entry.id !== attachment.id);
    await writeJson(token, receiptFileId, stored);
  }

  stored.attachments = requestedIds
    .map((id, index) => {
      const attachment = stored.attachments.find((entry) => entry.id === id);
      return attachment ? { ...attachment, sortOrder: index + 1 } : undefined;
    })
    .filter((attachment): attachment is Attachment => attachment !== undefined);
  await writeJson(token, receiptFileId, stored);
}

async function storage(token: string): Promise<Storage> {
  const root = config().rootFolderId;
  const receiptsFolderId = await findOrCreateFolder(token, "receipts", root);
  const trashFolderId = await findOrCreateFolder(token, "trash", root);
  const files = await listFiles(
    token,
    `'${escapeQuery(root)}' in parents and name = 'index.json' and trashed = false`,
  );
  const indexFileId =
    files[0]?.id ??
    (await createJson(token, "index.json", root, {
      version: 1,
      updatedAt: now(),
      receipts: [],
    } satisfies IndexDocument));
  return { receiptsFolderId, trashFolderId, indexFileId };
}

function attachmentUrl(receiptId: string, attachmentId: string): string {
  return `/api/receipts/${encodeURIComponent(receiptId)}/images/${encodeURIComponent(attachmentId)}`;
}

function toClient(receipt: StoredReceipt, includeImages = false): Receipt {
  return {
    id: receipt.id,
    store: receipt.storeName,
    purchaseDate: receipt.purchaseDate,
    notes: receipt.notes ?? undefined,
    images: includeImages
      ? [...receipt.attachments]
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((attachment, index) => ({
            id: attachment.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            width: attachment.width,
            height: attachment.height,
            sortOrder: attachment.sortOrder,
            createdAt: attachment.createdAt,
            label: `Pagina ${index + 1}`,
            url: attachmentUrl(receipt.id, attachment.id),
          }))
      : [],
    createdAt: receipt.createdAt,
    products: receipt.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity > 0 ? item.quantity : 1,
      price: item.price,
      warrantyMonths: item.warrantyMonths,
      warrantyExpiration: item.warrantyEndDate,
      autoDelete: item.autoDelete !== false,
      category: item.category,
    })),
  };
}

function toIndex(receipt: StoredReceipt): IndexEntry {
  return {
    id: receipt.id,
    storeName: receipt.storeName,
    purchaseDate: receipt.purchaseDate,
    currency: receipt.currency,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    status: receipt.status,
    notes: receipt.notes,
    items: receipt.items.map(
      ({ id, name, quantity, price, warrantyEndDate, warrantyMonths, autoDelete, category }) => ({
        id,
        name,
        quantity,
        price,
        warrantyEndDate,
        warrantyMonths,
        autoDelete,
        category,
      }),
    ),
  };
}

function validateClientReceipt(receipt: Receipt) {
  if (
    !receipt.id.trim() ||
    !receipt.store.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(receipt.purchaseDate) ||
    !receipt.products.length
  )
    throw new Error("Receipt metadata is incomplete.");
  for (const product of receipt.products) {
    if (
      !product.name.trim() ||
      !Number.isInteger(product.quantity) ||
      product.quantity < 1 ||
      !Number.isFinite(product.price) ||
      product.price < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(product.warrantyExpiration)
    )
      throw new Error("Product metadata is invalid.");
  }
}

function toStored(
  receipt: Receipt,
  userEmail: string,
  existing?: StoredReceipt,
  ocr?: ReceiptOcrRecord,
): StoredReceipt {
  validateClientReceipt(receipt);
  const timestamp = now();
  return {
    id: existing?.id ?? receipt.id,
    storeName: receipt.store.trim(),
    purchaseDate: receipt.purchaseDate,
    currency: "EUR",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    trashedAt: existing?.trashedAt ?? null,
    createdBy: existing?.createdBy ?? userEmail,
    status: existing?.status ?? "active",
    notes: receipt.notes?.trim() || null,
    ocr: ocr ?? existing?.ocr ?? null,
    attachments: existing?.attachments ?? [],
    items: receipt.products.map((product, index) => ({
      id: existing?.items[index]?.id ?? randomUUID(),
      name: product.name.trim(),
      brand: null,
      serialNumber: null,
      quantity: product.quantity,
      price: product.price,
      warrantyStartDate: receipt.purchaseDate,
      warrantyMonths: product.warrantyMonths,
      warrantyEndDate: product.warrantyExpiration,
      autoDelete: product.autoDelete ?? existing?.items[index]?.autoDelete ?? true,
      notes: null,
      category: product.category,
    })),
  };
}

async function receiptFile(token: string, folderId: string) {
  const files = await listFiles(
    token,
    `'${escapeQuery(folderId)}' in parents and name = 'receipt.json' and trashed = false`,
  );
  return files[0]?.id;
}

async function folderForReceipt(token: string, parent: string, id: string) {
  const files = await listFiles(
    token,
    `'${escapeQuery(parent)}' in parents and name = '${escapeQuery(id)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  );
  return files[0]?.id;
}

async function updateIndex(
  token: string,
  indexId: string,
  change: (index: IndexDocument) => IndexDocument,
) {
  const current = await readJson<IndexDocument>(token, indexId);
  const next = change({
    version: 1,
    updatedAt: now(),
    receipts: Array.isArray(current.receipts) ? current.receipts : [],
  });
  await writeJson(token, indexId, { ...next, updatedAt: now() });
}

export async function initializeStorage() {
  await requireAuthenticatedUser();
  const token = await accessToken();
  await storage(token);
}

export async function listReceipts() {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const index = await readJson<IndexDocument>(token, s.indexFileId);
  return (Array.isArray(index.receipts) ? index.receipts : [])
    .filter((entry) => entry.status === "active")
    .map((entry) => ({
      id: entry.id,
      store: entry.storeName,
      purchaseDate: entry.purchaseDate,
      notes: entry.notes ?? undefined,
      images: [],
      createdAt: entry.createdAt,
      products: entry.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity > 0 ? item.quantity : 1,
        price: item.price,
        warrantyMonths: item.warrantyMonths,
        warrantyExpiration: item.warrantyEndDate,
        autoDelete: item.autoDelete !== false,
        category: item.category,
      })),
    }));
}

export async function listTrashReceipts() {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folders = await listFiles(
    token,
    `'${escapeQuery(s.trashFolderId)}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  );
  const receipts: Receipt[] = [];
  for (const folder of folders) {
    if (!folder.id) continue;
    try {
      const file = await receiptFile(token, folder.id);
      if (!file) continue;
      const receipt = await readJson<StoredReceipt>(token, file);
      if (receipt.status === "trash") receipts.push(toClient(receipt));
    } catch {
      /* malformed entries are ignored */
    }
  }
  return receipts;
}

export async function getReceipt(id: string) {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder =
    (await folderForReceipt(token, s.receiptsFolderId, id)) ??
    (await folderForReceipt(token, s.trashFolderId, id));
  if (!folder) return undefined;
  const file = await receiptFile(token, folder);
  if (!file) return undefined;
  return toClient(await readJson<StoredReceipt>(token, file), true);
}

function logReceiptImageDiagnostic(message: string, details?: Record<string, unknown>) {
  if (process.env["NODE_ENV"] === "production") return;
  if (details) console.info(`[receipt-image] ${message}`, details);
  else console.info(`[receipt-image] ${message}`);
}

type DriveImageMetadata = {
  id?: string;
  name?: string;
  mimeType?: string;
  trashed?: boolean;
  parents?: string[];
};

function receiptImageNotFound(stage: string): Response {
  return Response.json(
    { error: "Receipt image unavailable", stage },
    {
      status: 404,
      headers: {
        "cache-control": "no-store",
        "x-receipt-image-stage": stage,
      },
    },
  );
}

async function getDriveImageMetadata(
  token: string,
  fileId: string,
): Promise<DriveImageMetadata | undefined> {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "id,name,mimeType,trashed,parents");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, { headers: headers(token) });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    logReceiptImageDiagnostic("Drive metadata lookup failed", {
      driveFileId: fileId,
      status: response.status,
    });
    throw new Error(`Google Drive could not inspect the receipt image (${response.status}).`);
  }
  return (await response.json()) as DriveImageMetadata;
}

async function downloadDriveImage(token: string, fileId: string): Promise<Response | undefined> {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, { headers: headers(token) });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    logReceiptImageDiagnostic("Drive image download failed", {
      driveFileId: fileId,
      status: response.status,
    });
    throw new Error(`Google Drive could not load the receipt image (${response.status}).`);
  }
  return response;
}

export async function getReceiptImage(
  id: string,
  attachmentId: string,
): Promise<Response | undefined> {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder =
    (await folderForReceipt(token, s.receiptsFolderId, id)) ??
    (await folderForReceipt(token, s.trashFolderId, id));
  if (!folder) {
    logReceiptImageDiagnostic("Receipt folder not found", { receiptId: id, attachmentId });
    return receiptImageNotFound("receipt-folder");
  }

  const receiptJson = await receiptFile(token, folder);
  if (!receiptJson) {
    logReceiptImageDiagnostic("receipt.json not found", { receiptId: id, attachmentId });
    return receiptImageNotFound("receipt-json");
  }

  const receipt = await readJson<StoredReceipt>(token, receiptJson);
  const attachment = receipt.attachments.find((entry) => entry.id === attachmentId);
  if (!attachment) {
    logReceiptImageDiagnostic("Attachment metadata not found", {
      receiptId: id,
      attachmentId,
    });
    return receiptImageNotFound("attachment");
  }

  logReceiptImageDiagnostic("Resolved attachment", {
    receiptId: id,
    attachmentId,
    driveFileId: attachment.driveFileId,
  });

  const metadata = await getDriveImageMetadata(token, attachment.driveFileId);
  if (!metadata || metadata.trashed === true) {
    logReceiptImageDiagnostic("Drive file not found or trashed", {
      receiptId: id,
      attachmentId,
      driveFileId: attachment.driveFileId,
    });
    return receiptImageNotFound(metadata?.trashed === true ? "drive-trashed" : "drive-metadata");
  }

  const response = await downloadDriveImage(token, attachment.driveFileId);
  if (!response?.body) {
    logReceiptImageDiagnostic("Drive image body unavailable", {
      receiptId: id,
      attachmentId,
      driveFileId: attachment.driveFileId,
    });
    return receiptImageNotFound("drive-download");
  }

  const contentLength = response.headers.get("content-length");
  return new Response(response.body, {
    headers: {
      "content-type": metadata.mimeType || attachment.mimeType,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
  });
}

export async function createReceipt(receipt: Receipt) {
  return await createReceiptWithImages(receipt, []);
}

export async function createReceiptWithImages(
  receipt: Receipt,
  uploads: ReceiptImageUpload[],
  ocr?: ReceiptOcrRecord,
) {
  const user = await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const existingFolder = await folderForReceipt(token, s.receiptsFolderId, receipt.id);
  const folder = existingFolder ?? (await createFolder(token, receipt.id, s.receiptsFolderId));
  const existingFile = await receiptFile(token, folder);
  const existing = existingFile ? await readJson<StoredReceipt>(token, existingFile) : undefined;
  if (existing && existing.status !== "active") throw new Error("Receipt is not available.");
  const stored = toStored(receipt, user.email, existing, ocr);
  const receiptFileId = existingFile ?? (await createJson(token, "receipt.json", folder, stored));
  if (existingFile) await writeJson(token, receiptFileId, stored);
  await updateIndex(token, s.indexFileId, (index) => ({
    ...index,
    receipts: [...index.receipts.filter((entry) => entry.id !== stored.id), toIndex(stored)],
  }));
  await persistImages(
    token,
    folder,
    receiptFileId,
    stored,
    receipt.images.map(({ id, sortOrder }) => ({ id, sortOrder })),
    uploads,
  );
  return toClient(stored);
}

export async function updateReceipt(receipt: Receipt) {
  return await updateReceiptWithImages(receipt, undefined);
}

export async function updateReceiptWithImages(
  receipt: Receipt,
  uploads: ReceiptImageUpload[] | undefined,
  ocr?: ReceiptOcrRecord,
) {
  const user = await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder = await folderForReceipt(token, s.receiptsFolderId, receipt.id);
  if (!folder) throw new Error("Receipt not found.");
  const file = await receiptFile(token, folder);
  if (!file) throw new Error("Receipt metadata is missing.");
  const existing = await readJson<StoredReceipt>(token, file);
  const stored = toStored(receipt, user.email, existing, ocr);
  await writeJson(token, file, stored);
  if (uploads) {
    await persistImages(
      token,
      folder,
      file,
      stored,
      receipt.images.map(({ id, sortOrder }) => ({ id, sortOrder })),
      uploads,
    );
  }
  await updateIndex(token, s.indexFileId, (index) => ({
    ...index,
    receipts: [...index.receipts.filter((entry) => entry.id !== stored.id), toIndex(stored)],
  }));
  return toClient(stored, true);
}

async function moveFolder(
  token: string,
  folderId: string,
  addParent: string,
  removeParent: string,
) {
  const response = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(folderId)}?addParents=${encodeURIComponent(addParent)}&removeParents=${encodeURIComponent(removeParent)}`,
    { method: "PATCH", headers: headers(token) },
  );
  if (!response.ok) throw new Error("Google Drive could not move the receipt.");
}

async function deleteDriveFilePermanently(token: string, fileId: string) {
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, {
    method: "DELETE",
    headers: headers(token),
  });
  if (response.status === 404) return;
  if (!response.ok) throw new Error("Google Drive could not permanently delete the receipt.");
}

export async function moveReceiptToTrash(id: string) {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder = await folderForReceipt(token, s.receiptsFolderId, id);
  if (!folder) throw new Error("Receipt not found.");
  const file = await receiptFile(token, folder);
  if (!file) throw new Error("Receipt metadata is missing.");
  const receipt = await readJson<StoredReceipt>(token, file);
  const timestamp = now();
  receipt.status = "trash";
  receipt.updatedAt = timestamp;
  receipt.trashedAt = timestamp;
  await writeJson(token, file, receipt);
  await moveFolder(token, folder, s.trashFolderId, s.receiptsFolderId);
  await updateIndex(token, s.indexFileId, (index) => ({
    ...index,
    receipts: index.receipts.filter((entry) => entry.id !== id),
  }));
}

export async function setReceiptAutoDelete(id: string, autoDelete: boolean) {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder = await folderForReceipt(token, s.receiptsFolderId, id);
  if (!folder) throw new Error("Receipt not found.");
  const file = await receiptFile(token, folder);
  if (!file) throw new Error("Receipt metadata is missing.");
  const receipt = await readJson<StoredReceipt>(token, file);
  receipt.items = receipt.items.map((item) => ({ ...item, autoDelete }));
  receipt.updatedAt = now();
  await writeJson(token, file, receipt);
  await updateIndex(token, s.indexFileId, (index) => ({
    ...index,
    receipts: [...index.receipts.filter((entry) => entry.id !== id), toIndex(receipt)],
  }));
  return toClient(receipt, true);
}

export async function restoreReceipt(id: string) {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folder = await folderForReceipt(token, s.trashFolderId, id);
  if (!folder) throw new Error("Receipt not found.");
  const file = await receiptFile(token, folder);
  if (!file) throw new Error("Receipt metadata is missing.");
  const receipt = await readJson<StoredReceipt>(token, file);
  receipt.status = "active";
  receipt.updatedAt = now();
  receipt.trashedAt = null;
  await writeJson(token, file, receipt);
  await moveFolder(token, folder, s.receiptsFolderId, s.trashFolderId);
  await updateIndex(token, s.indexFileId, (index) => ({
    ...index,
    receipts: [...index.receipts.filter((entry) => entry.id !== id), toIndex(receipt)],
  }));
  return toClient(receipt);
}

export type AutomaticCleanupReport = {
  archived: number;
  permanentlyDeleted: number;
  failures: number;
};

export async function runAutomaticCleanup(
  currentDate = new Date(),
): Promise<AutomaticCleanupReport> {
  const token = await accessToken();
  const s = await storage(token);
  const todayIso = currentDate.toISOString().slice(0, 10);
  const report: AutomaticCleanupReport = {
    archived: 0,
    permanentlyDeleted: 0,
    failures: 0,
  };

  const index = await readJson<IndexDocument>(token, s.indexFileId);
  const activeEntries = Array.isArray(index.receipts)
    ? index.receipts.filter((entry) => indexEntryCouldAutoArchive(entry, todayIso))
    : [];

  for (const entry of activeEntries) {
    try {
      const folder = await folderForReceipt(token, s.receiptsFolderId, entry.id);
      if (!folder) continue;
      const file = await receiptFile(token, folder);
      if (!file) continue;

      const receipt = await readJson<StoredReceipt>(token, file);
      if (!shouldAutoArchiveReceipt(receipt, todayIso)) continue;

      const timestamp = currentDate.toISOString();
      receipt.status = "trash";
      receipt.updatedAt = timestamp;
      receipt.trashedAt = timestamp;
      await writeJson(token, file, receipt);
      await moveFolder(token, folder, s.trashFolderId, s.receiptsFolderId);
      await updateIndex(token, s.indexFileId, (current) => ({
        ...current,
        receipts: current.receipts.filter((candidate) => candidate.id !== receipt.id),
      }));
      report.archived += 1;
    } catch (error) {
      report.failures += 1;
      console.error("[automatic-cleanup] Could not archive receipt", {
        receiptId: entry.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const trashFolders = await listFiles(
    token,
    `'${escapeQuery(s.trashFolderId)}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  );

  for (const folder of trashFolders) {
    if (!folder.id) continue;
    try {
      const file = await receiptFile(token, folder.id);
      if (!file) continue;

      const receipt = await readJson<StoredReceipt>(token, file);
      if (receipt.status !== "trash") continue;

      const trashedAt = receipt.trashedAt ?? receipt.updatedAt;
      const trashDate = trashedAt.slice(0, 10);
      const daysInTrash = daysSinceDate(trashDate, todayIso);
      if (daysInTrash === undefined || daysInTrash < TRASH_GRACE_DAYS) continue;

      await deleteDriveFilePermanently(token, folder.id);
      await updateIndex(token, s.indexFileId, (current) => ({
        ...current,
        receipts: current.receipts.filter((candidate) => candidate.id !== receipt.id),
      }));
      report.permanentlyDeleted += 1;
    } catch (error) {
      report.failures += 1;
      console.error("[automatic-cleanup] Could not permanently delete receipt", {
        folderId: folder.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return report;
}

export async function rebuildIndex() {
  await requireAuthenticatedUser();
  const token = await accessToken();
  const s = await storage(token);
  const folders = await listFiles(
    token,
    `'${escapeQuery(s.receiptsFolderId)}' in parents and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
  );
  const entries: IndexEntry[] = [];
  for (const folder of folders) {
    if (!folder.id) continue;
    try {
      const file = await receiptFile(token, folder.id);
      if (!file) continue;
      const receipt = await readJson<StoredReceipt>(token, file);
      if (receipt.status === "active" && receipt.id && Array.isArray(receipt.items))
        entries.push(toIndex(receipt));
    } catch {
      /* malformed receipt metadata is skipped */
    }
  }
  await writeJson(token, s.indexFileId, { version: 1, updatedAt: now(), receipts: entries });
}
