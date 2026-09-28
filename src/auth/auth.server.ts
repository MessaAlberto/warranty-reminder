import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { deleteCookie, getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { EncryptJWT, createRemoteJWKSet, jwtDecrypt, jwtVerify } from "jose";

import type { AuthenticatedUser, GoogleAuthenticationResult } from "./auth-types";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const SESSION_COOKIE = "warranty_reminder_session";
const OAUTH_TRANSACTION_COOKIE = "warranty_reminder_oauth";
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const OAUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;

type AuthConfig = {
  clientId: string;
  clientSecret: string;
  appUrl: string;
  allowedEmails: ReadonlySet<string>;
  sessionKey: Uint8Array;
};

type OAuthTransaction = {
  state: string;
  verifier: string;
  nonce: string;
};

type GoogleTokenResponse = {
  id_token?: unknown;
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

function getAuthConfig(): AuthConfig {
  const clientId = requiredEnvironment("GOOGLE_AUTH_CLIENT_ID");
  const clientSecret = requiredEnvironment("GOOGLE_AUTH_CLIENT_SECRET");
  const authSecret = requiredEnvironment("AUTH_SECRET");
  if (authSecret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }
  const configuredAppUrl = new URL(requiredEnvironment("APP_URL"));
  if (configuredAppUrl.protocol !== "http:" && configuredAppUrl.protocol !== "https:") {
    throw new Error("APP_URL must use http or https.");
  }
  if (isProduction() && configuredAppUrl.protocol !== "https:") {
    throw new Error("APP_URL must use https in production.");
  }
  const appUrl = configuredAppUrl.origin;
  const configuredEmails = requiredEnvironment("ALLOWED_USER_EMAILS")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  const allowedEmails = new Set(configuredEmails);

  if (allowedEmails.size !== 2 || configuredEmails.length !== 2) {
    throw new Error("ALLOWED_USER_EMAILS must contain exactly two unique email addresses.");
  }

  return {
    clientId,
    clientSecret,
    appUrl,
    allowedEmails,
    sessionKey: new Uint8Array(createHash("sha256").update(authSecret).digest()),
  };
}

function getCallbackUrl(config: AuthConfig): string {
  return `${config.appUrl}/auth/google/callback`;
}

function createTransaction(): OAuthTransaction {
  return {
    state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(64).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
  };
}

function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function setOAuthTransaction(transaction: OAuthTransaction): void {
  setCookie(OAUTH_TRANSACTION_COOKIE, JSON.stringify(transaction), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: OAUTH_TRANSACTION_MAX_AGE_SECONDS,
  });
}

function takeOAuthTransaction(): OAuthTransaction | undefined {
  const rawTransaction = getCookie(OAUTH_TRANSACTION_COOKIE);
  deleteCookie(OAUTH_TRANSACTION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
  });

  if (!rawTransaction) return undefined;

  try {
    const transaction = JSON.parse(rawTransaction) as Partial<OAuthTransaction>;
    if (
      typeof transaction.state !== "string" ||
      typeof transaction.verifier !== "string" ||
      typeof transaction.nonce !== "string"
    ) {
      return undefined;
    }
    return { state: transaction.state, verifier: transaction.verifier, nonce: transaction.nonce };
  } catch {
    return undefined;
  }
}

function sameSecret(left: string, right: string): boolean {
  const leftValue = Buffer.from(left);
  const rightValue = Buffer.from(right);
  return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

function initialsFor(name: string, email: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || email.slice(0, 2).toUpperCase();
}

function safePicture(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function toUser(payload: Record<string, unknown>): AuthenticatedUser | undefined {
  if (typeof payload["email"] !== "string" || payload["email_verified"] !== true) {
    return undefined;
  }

  return toSessionUser(payload);
}

function toSessionUser(payload: Record<string, unknown>): AuthenticatedUser | undefined {
  if (typeof payload["email"] !== "string") return undefined;

  const email = normalizeEmail(payload["email"]);
  if (!email) return undefined;

  const name =
    typeof payload["name"] === "string" && payload["name"].trim() ? payload["name"].trim() : email;
  const user = {
    email,
    name,
    initials: initialsFor(name, email),
  };
  const picture = safePicture(payload["picture"]);
  return picture ? { ...user, picture } : user;
}

async function encryptSession(user: AuthenticatedUser, config: AuthConfig): Promise<string> {
  return new EncryptJWT({
    email: user.email,
    name: user.name,
    initials: user.initials,
    ...(user.picture ? { picture: user.picture } : {}),
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(config.sessionKey);
}

function setSession(session: string): void {
  setCookie(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function clearSession(): void {
  deleteCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
  });
}

async function exchangeAuthorizationCode(
  code: string,
  transaction: OAuthTransaction,
  config: AuthConfig,
): Promise<GoogleTokenResponse | undefined> {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getCallbackUrl(config),
      grant_type: "authorization_code",
      code_verifier: transaction.verifier,
    }),
  });

  if (!response.ok) return undefined;
  return (await response.json()) as GoogleTokenResponse;
}

/** Reads the encrypted session from the current server request. */
export async function getCurrentUser(): Promise<AuthenticatedUser | undefined> {
  if (!process.env["AUTH_SECRET"]?.trim()) return undefined;

  try {
    const config = getAuthConfig();
    const token = getCookie(SESSION_COOKIE);
    if (!token) return undefined;
    const { payload } = await jwtDecrypt(token, config.sessionKey);
    const user = toSessionUser(payload);
    return user && config.allowedEmails.has(user.email) ? user : undefined;
  } catch {
    return undefined;
  }
}

/** Use this in future protected server functions before accessing private services. */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required.");
  return user;
}

export function beginGoogleAuthentication(): { authorizationUrl: string } {
  const config = getAuthConfig();
  const transaction = createTransaction();
  setOAuthTransaction(transaction);

  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  authorizationUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getCallbackUrl(config),
    response_type: "code",
    scope: "openid email profile",
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: codeChallenge(transaction.verifier),
    code_challenge_method: "S256",
  }).toString();

  return { authorizationUrl: authorizationUrl.toString() };
}

export async function completeGoogleAuthentication(): Promise<GoogleAuthenticationResult> {
  const config = getAuthConfig();
  clearSession();
  const callbackUrl = new URL(getRequest().url);
  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");
  const transaction = takeOAuthTransaction();

  if (!code || !state || !transaction || !sameSecret(state, transaction.state)) {
    return { status: "invalid_callback" };
  }

  const tokenResponse = await exchangeAuthorizationCode(code, transaction, config);
  if (typeof tokenResponse?.id_token !== "string") return { status: "invalid_callback" };

  try {
    const { payload } = await jwtVerify(tokenResponse.id_token, GOOGLE_JWKS, {
      audience: config.clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    if (payload["nonce"] !== transaction.nonce) return { status: "invalid_callback" };

    const user = toUser(payload);
    if (!user || !config.allowedEmails.has(user.email)) return { status: "access_denied" };

    setSession(await encryptSession(user, config));
    return { status: "authenticated", user };
  } catch {
    return { status: "invalid_callback" };
  }
}

export function logout(): void {
  clearSession();
}
