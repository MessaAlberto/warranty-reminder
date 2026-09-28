import { createFileRoute, redirect } from "@tanstack/react-router";

import { beginGoogleAuthentication } from "@/auth/auth-functions";

export const Route = createFileRoute("/auth/start")({
  loader: async () => {
    const { authorizationUrl } = await beginGoogleAuthentication();
    throw redirect({ href: authorizationUrl });
  },
  component: EmptyRoute,
});

function EmptyRoute() {
  return null;
}
