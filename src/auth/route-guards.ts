import { redirect } from "@tanstack/react-router";

import { getCurrentUserServerFn } from "./auth-functions";

export async function requireAuthenticatedRoute() {
  const user = await getCurrentUserServerFn();
  if (!user) throw redirect({ to: "/" });
  return { user };
}
