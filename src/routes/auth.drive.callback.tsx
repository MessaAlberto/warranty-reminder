import { createFileRoute, redirect } from "@tanstack/react-router";

import { completeDriveAuthorization } from "@/drive/drive-functions";

export const Route = createFileRoute("/auth/drive/callback")({
  loader: async () => {
    const result = await completeDriveAuthorization();
    throw redirect({ to: result === "ready" ? "/drive/setup" : "/auth/denied" });
  },
  component: EmptyRoute,
});

function EmptyRoute() {
  return null;
}
