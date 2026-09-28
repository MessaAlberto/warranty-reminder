import { createFileRoute } from "@tanstack/react-router";

import { requireAuthenticatedUser } from "@/auth/auth.server";
import { extractTextFromImage } from "@/ocr/vision.server";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const Route = createFileRoute("/api/ocr-test")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }) => {
        await requireAuthenticatedUser();

        const formData = await request.formData();
        const image = formData.get("image");

        if (!(image instanceof File)) {
          return Response.json(
            { error: "Missing image file." },
            { status: 400 },
          );
        }

        if (!SUPPORTED_IMAGE_TYPES.has(image.type)) {
          return Response.json(
            { error: "Unsupported image type." },
            { status: 400 },
          );
        }

        if (image.size === 0 || image.size > 10 * 1024 * 1024) {
          return Response.json(
            { error: "Image must be between 1 byte and 10 MB." },
            { status: 400 },
          );
        }

        try {
          const text = await extractTextFromImage(
            new Uint8Array(await image.arrayBuffer()),
          );

          return Response.json({
            ok: true,
            text,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "OCR failed.";

          return Response.json(
            {
              ok: false,
              error: message,
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
