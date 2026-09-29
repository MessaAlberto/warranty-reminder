import { createFileRoute } from "@tanstack/react-router";

import { runAutomaticCleanup } from "@/drive/receipt-repository.server";

function cronSecret(): string | undefined {
  return process.env["CRON_SECRET"]?.trim() || undefined;
}

export const Route = createFileRoute("/api/cleanup")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = cronSecret();
        const authorization = request.headers.get("authorization");

        if (!secret || authorization !== `Bearer ${secret}`) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        try {
          const report = await runAutomaticCleanup();
          return Response.json({ ok: true, ...report });
        } catch (error) {
          console.error("[automatic-cleanup] Cleanup failed", {
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return Response.json(
            { ok: false, error: "Automatic cleanup failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
