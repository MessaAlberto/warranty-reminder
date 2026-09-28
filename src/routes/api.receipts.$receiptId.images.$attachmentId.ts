import { createFileRoute } from "@tanstack/react-router";

import { getReceiptImage } from "@/drive/receipt-repository.server";

export const Route = createFileRoute(
  "/api/receipts/$receiptId/images/$attachmentId",
)({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ params }) => {
        const image = await getReceiptImage(
          params.receiptId,
          params.attachmentId,
        );

        return image ?? new Response(null, { status: 404 });
      },
    },
  },
});
