import { createFileRoute, redirect } from "@tanstack/react-router";

import { beginDriveAuthorization } from "@/drive/drive-functions";
import { requireStorageOwnerRoute } from "@/drive/drive-route-guards";

export const Route = createFileRoute("/auth/drive/start")({
  beforeLoad: requireStorageOwnerRoute,
  loader: async () => {
    const { authorizationUrl } = await beginDriveAuthorization();
    throw redirect({ href: authorizationUrl });
  },
  component: EmptyRoute,
});

function EmptyRoute() {
  return null;
}
