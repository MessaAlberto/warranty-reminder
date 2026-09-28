import { redirect } from "@tanstack/react-router";

import { getCurrentUserServerFn } from "../auth/auth-functions";
import { getDriveSettings } from "./drive-functions";

/** Route-level UX guard; the server functions also enforce storage-owner authorization. */
export async function requireStorageOwnerRoute() {
  const user = await getCurrentUserServerFn();
  if (!user) throw redirect({ to: "/" });

  const settings = await getDriveSettings();
  if (!settings?.canConfigure) throw redirect({ to: "/settings" });
  return { user };
}
