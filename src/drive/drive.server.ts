import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { EncryptJWT, createRemoteJWKSet, jwtDecrypt, jwtVerify } from "jose";

import { getCurrentUser, requireAuthenticatedUser } from "../auth/auth.server";
import type { DrivePickerConfiguration, DriveSetupResult, DriveStorageStatus } from "./drive-types";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const DRIVE_API_ENDPOINT = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_OAUTH_COOKIE = "warranty_reminder_drive_oauth";
const DRIVE_OAUTH_MAX_AGE_SECONDS = 10 * 60;
const LOCAL_SETUP_FILE = "drive-setup.env";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

type DriveConfig = {
  clientId: string;
  clientSecret: string;
  appUrl: string;
  ownerEmail: string;
};

type DriveOAuthTransaction = {
  state: string;
  verifier: string;
  nonce: string;
  ownerEmail: string;
  refreshToken?: string;
  accessToken?: string;
};

type GoogleTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
};

type DriveFile = {
  id?: unknown;
  name?: unknown;
  mimeType?: unknown;
  trashed?: unknown;
};

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getDriveConfig(): DriveConfig {
  const configuredAppUrl = new URL(requiredEnvironment("APP_URL"));
  if (configuredAppUrl.protocol !== "http:" && configuredAppUrl.protocol !== "https:") {
    throw new Error("APP_URL must use http or https.");
  }
  if (isProduction() && configuredAppUrl.protocol !== "https:") {
    throw new Error("APP_URL must use https in production.");
  }

  return {
    clientId: requiredEnvironment("GOOGLE_AUTH_CLIENT_ID"),
    clientSecret: requiredEnvironment("GOOGLE_AUTH_CLIENT_SECRET"),
    appUrl: configuredAppUrl.origin,
    ownerEmail: normalizeEmail(requiredEnvironment("GOOGLE_DRIVE_OWNER_EMAIL")),
  };
}

function getDriveCallbackUrl(config: DriveConfig): string {
  return `${config.appUrl}/auth/drive/callback`;
}

function createTransaction(ownerEmail: string): DriveOAuthTransaction {
  return {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(64).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    ownerEmail,
  };
}

function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function sameSecret(left: string, right: string): boolean {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

function transactionKey(): Uint8Array {
  const authSecret = requiredEnvironment("AUTH_SECRET");
  if (authSecret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters long.");
  return new Uint8Array(createHash("sha256").update(authSecret).digest());
}

async function setTransaction(transaction: DriveOAuthTransaction): Promise<void> {
  const value = await new EncryptJWT(transaction)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${DRIVE_OAUTH_MAX_AGE_SECONDS}s`)
    .encrypt(transactionKey());
  setCookie(DRIVE_OAUTH_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: DRIVE_OAUTH_MAX_AGE_SECONDS,
  });
}

async function getTransaction(): Promise<DriveOAuthTransaction | undefined> {
  const rawTransaction = getCookie(DRIVE_OAUTH_COOKIE);
  if (!rawTransaction) return undefined;

  try {
    const { payload } = await jwtDecrypt(rawTransaction, transactionKey());
    const transaction = payload as Partial<DriveOAuthTransaction>;
    if (
      typeof transaction.state !== "string" ||
      typeof transaction.verifier !== "string" ||
      typeof transaction.nonce !== "string" ||
      typeof transaction.ownerEmail !== "string"
    ) {
      return undefined;
    }
    return transaction as DriveOAuthTransaction;
  } catch {
    return undefined;
  }
}

function clearTransaction(): void {
  deleteCookie(DRIVE_OAUTH_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
  });
}

async function requireStorageOwner() {
  const user = await requireAuthenticatedUser();
  const config = getDriveConfig();
  if (user.email !== config.ownerEmail) throw new Error("Storage owner access is required.");
  return { user, config };
}

async function exchangeAuthorizationCode(
  code: string,
  transaction: DriveOAuthTransaction,
  config: DriveConfig,
): Promise<GoogleTokenResponse | undefined> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getDriveCallbackUrl(config),
      grant_type: "authorization_code",
      code_verifier: transaction.verifier,
    }),
  });

  if (!response.ok) return undefined;
  return (await response.json()) as GoogleTokenResponse;
}

async function verifyOwnerIdentity(
  idToken: string,
  transaction: DriveOAuthTransaction,
  config: DriveConfig,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      audience: config.clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    return (
      payload["nonce"] === transaction.nonce &&
      payload["email_verified"] === true &&
      typeof payload["email"] === "string" &&
      normalizeEmail(payload["email"]) === transaction.ownerEmail
    );
  } catch {
    return false;
  }
}

async function refreshAccessToken(refreshToken: string, config: DriveConfig): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Google Drive authorization could not be refreshed.");
  const body = (await response.json()) as GoogleTokenResponse;
  if (typeof body.access_token !== "string") {
    throw new Error("Google Drive did not return an access token.");
  }
  return body.access_token;
}

function driveHeaders(accessToken: string): HeadersInit {
  return { authorization: `Bearer ${accessToken}` };
}

async function getFolder(
  accessToken: string,
  folderId: string,
): Promise<{ id: string; name: string }> {
  const response = await fetch(
    `${DRIVE_API_ENDPOINT}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,trashed`,
    { headers: driveHeaders(accessToken) },
  );
  if (!response.ok) throw new Error("The selected Drive folder is unavailable.");
  const folder = (await response.json()) as DriveFile;
  if (
    typeof folder.id !== "string" ||
    typeof folder.name !== "string" ||
    folder.mimeType !== FOLDER_MIME_TYPE ||
    folder.trashed === true
  ) {
    throw new Error("The selected Drive item is not an available folder.");
  }
  return { id: folder.id, name: folder.name };
}

async function createTemporaryFile(
  accessToken: string,
  folderId: string,
  fileName: string,
): Promise<string> {
  const boundary = `warranty-reminder-${randomBytes(12).toString("hex")}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ name: fileName, mimeType: "text/plain", parents: [folderId] }),
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    "Warranty Reminder Drive connection test.",
    `--${boundary}--`,
    "",
  ].join("\r\n");
  const response = await fetch(`${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      ...driveHeaders(accessToken),
      "content-type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) throw new Error("The temporary Drive test file could not be created.");
  const created = (await response.json()) as DriveFile;
  if (typeof created.id !== "string")
    throw new Error("Google Drive did not return the temporary file.");
  return created.id;
}

async function confirmTemporaryFile(
  accessToken: string,
  folderId: string,
  fileId: string,
  fileName: string,
): Promise<void> {
  const [readResponse, listResponse] = await Promise.all([
    fetch(`${DRIVE_API_ENDPOINT}/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: driveHeaders(accessToken),
    }),
    fetch(
      `${DRIVE_API_ENDPOINT}/files?q=${encodeURIComponent(`'${folderId}' in parents and name = '${fileName}' and trashed = false`)}&fields=files(id)`,
      { headers: driveHeaders(accessToken) },
    ),
  ]);
  if (!readResponse.ok || !listResponse.ok) {
    throw new Error("The temporary Drive test file could not be read or listed.");
  }
  const contents = await readResponse.text();
  const listed = (await listResponse.json()) as { files?: DriveFile[] };
  if (
    contents !== "Warranty Reminder Drive connection test." ||
    !listed.files?.some((file) => file.id === fileId)
  ) {
    throw new Error("The temporary Drive test file could not be confirmed.");
  }
}

async function deleteTemporaryFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`${DRIVE_API_ENDPOINT}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: driveHeaders(accessToken),
  });
  if (!response.ok) throw new Error("The temporary Drive test file could not be deleted.");
}

async function testFolder(accessToken: string, folderId: string): Promise<void> {
  await getFolder(accessToken, folderId);
  const fileName = `.warranty-reminder-connection-test-${randomBytes(12).toString("hex")}.txt`;
  let fileId: string | undefined;
  try {
    fileId = await createTemporaryFile(accessToken, folderId, fileName);
    await confirmTemporaryFile(accessToken, folderId, fileId, fileName);
  } finally {
    if (fileId) await deleteTemporaryFile(accessToken, fileId);
  }
}

async function writeLocalSetupResult(folderId: string, refreshToken: string): Promise<void> {
  if (isProduction()) {
    throw new Error("Complete the one-time Drive setup locally before configuring production.");
  }
  const contents = [
    "# Copy these values to .env.local and Vercel, then delete this file.",
    `GOOGLE_DRIVE_ROOT_FOLDER_ID=${folderId}`,
    `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`,
    "",
  ].join("\n");
  await writeFile(resolve(process.cwd(), LOCAL_SETUP_FILE), contents, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function configuredStorage(): { folderId: string; refreshToken: string } | undefined {
  const folderId = process.env["GOOGLE_DRIVE_ROOT_FOLDER_ID"]?.trim();
  const refreshToken = process.env["GOOGLE_DRIVE_REFRESH_TOKEN"]?.trim();
  return folderId && refreshToken ? { folderId, refreshToken } : undefined;
}

export function getDriveStorageStatus(): DriveStorageStatus {
  try {
    return configuredStorage() ? "connected" : "not_configured";
  } catch {
    return "connection_error";
  }
}

export async function getDriveSettings(): Promise<{
  status: DriveStorageStatus;
  canConfigure: boolean;
}> {
  const user = await requireAuthenticatedUser();
  try {
    return {
      status: getDriveStorageStatus(),
      canConfigure: user.email === getDriveConfig().ownerEmail,
    };
  } catch {
    return { status: "connection_error", canConfigure: false };
  }
}

export async function beginDriveAuthorization(): Promise<{ authorizationUrl: string }> {
  const { user, config } = await requireStorageOwner();
  const transaction = createTransaction(user.email);
  await setTransaction(transaction);

  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getDriveCallbackUrl(config),
    response_type: "code",
    scope: `openid email ${DRIVE_SCOPE}`,
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: codeChallenge(transaction.verifier),
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    login_hint: user.email,
  }).toString();

  return { authorizationUrl: authorizationUrl.toString() };
}

export async function completeDriveAuthorization(): Promise<"ready" | "invalid"> {
  const currentUser = await getCurrentUser();
  const config = getDriveConfig();
  const callbackUrl = new URL(getRequest().url);
  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");
  const transaction = await getTransaction();

  if (
    !currentUser ||
    currentUser.email !== config.ownerEmail ||
    !code ||
    !state ||
    !transaction ||
    transaction.ownerEmail !== config.ownerEmail ||
    !sameSecret(state, transaction.state)
  ) {
    clearTransaction();
    return "invalid";
  }

  const tokenResponse = await exchangeAuthorizationCode(code, transaction, config);
  if (
    typeof tokenResponse?.access_token !== "string" ||
    typeof tokenResponse.refresh_token !== "string" ||
    typeof tokenResponse.id_token !== "string" ||
    !(await verifyOwnerIdentity(tokenResponse.id_token, transaction, config))
  ) {
    clearTransaction();
    return "invalid";
  }

  await setTransaction({
    ...transaction,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
  });
  return "ready";
}

export async function getDrivePickerConfiguration(): Promise<DrivePickerConfiguration> {
  await requireStorageOwner();
  const transaction = await getTransaction();
  if (!transaction?.accessToken || !transaction.refreshToken) {
    clearTransaction();
    throw new Error("Start Drive setup again before opening the folder picker.");
  }
  return {
    accessToken: transaction.accessToken,
    apiKey: requiredEnvironment("GOOGLE_PICKER_API_KEY"),
    projectNumber: requiredEnvironment("GOOGLE_PROJECT_NUMBER"),
  };
}

export async function completeDriveSetup(folderId: string): Promise<DriveSetupResult> {
  await requireStorageOwner();
  const transaction = await getTransaction();
  if (!transaction?.refreshToken || !folderId.trim()) {
    throw new Error("Start Drive setup again before selecting a folder.");
  }

  try {
    const accessToken = await refreshAccessToken(transaction.refreshToken, getDriveConfig());
    await testFolder(accessToken, folderId.trim());
    await writeLocalSetupResult(folderId.trim(), transaction.refreshToken);
    clearTransaction();
    return { folderId: folderId.trim() };
  } catch (error) {
    clearTransaction();
    throw error;
  }
}

export async function cancelDriveSetup(): Promise<void> {
  await requireStorageOwner();
  clearTransaction();
}

export async function testConfiguredDriveConnection(): Promise<void> {
  await requireAuthenticatedUser();
  const storage = configuredStorage();
  if (!storage) throw new Error("Drive storage has not been configured.");
  const accessToken = await refreshAccessToken(storage.refreshToken, getDriveConfig());
  await testFolder(accessToken, storage.folderId);
}
