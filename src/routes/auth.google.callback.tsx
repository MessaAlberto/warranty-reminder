import { createFileRoute, redirect } from "@tanstack/react-router";

import { completeGoogleAuthentication } from "@/auth/auth-functions";

export const Route = createFileRoute("/auth/google/callback")({
  loader: async () => {
    const result = await completeGoogleAuthentication();
    if (result.status === "authenticated") throw redirect({ to: "/home" });
    throw redirect({
      to: "/auth/denied",
      search: { reason: result.status === "access_denied" ? "unauthorized" : "invalid" },
    });
  },
  component: EmptyRoute,
});

function EmptyRoute() {
  return null;
}
