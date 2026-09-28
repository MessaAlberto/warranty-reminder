import { createServerFn } from "@tanstack/react-start";

import {
  beginGoogleAuthentication as beginGoogleAuthenticationOnServer,
  completeGoogleAuthentication as completeGoogleAuthenticationOnServer,
  getCurrentUser,
  logout as logoutOnServer,
} from "./auth.server";

export const getCurrentUserServerFn = createServerFn({ method: "GET" }).handler(async () => {
  return await getCurrentUser();
});

export const beginGoogleAuthentication = createServerFn({ method: "GET" }).handler(() => {
  return beginGoogleAuthenticationOnServer();
});

export const completeGoogleAuthentication = createServerFn({ method: "GET" }).handler(async () => {
  return await completeGoogleAuthenticationOnServer();
});

export const logout = createServerFn({ method: "POST" }).handler(() => {
  logoutOnServer();
});
