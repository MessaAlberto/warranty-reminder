const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
    };
    error?: {
      code?: number;
      message?: string;
      status?: string;
    };
  }>;
};

function visionApiKey(): string {
  const key = process.env["GOOGLE_CLOUD_VISION_API_KEY"]?.trim();
  if (!key) {
    throw new Error("Google Cloud Vision is not configured.");
  }
  return key;
}

export async function extractTextFromImage(
  bytes: Uint8Array,
): Promise<string> {
  if (bytes.byteLength === 0) {
    throw new Error("The OCR image is empty.");
  }

  const response = await fetch(
    `${VISION_ENDPOINT}?key=${encodeURIComponent(visionApiKey())}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: Buffer.from(bytes).toString("base64"),
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
              },
            ],
            imageContext: {
              languageHints: ["it", "en"],
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Google Cloud Vision request failed (${response.status}): ${details}`,
    );
  }

  const result = (await response.json()) as VisionResponse;
  const annotation = result.responses?.[0];

  if (annotation?.error) {
    throw new Error(
      annotation.error.message ||
        annotation.error.status ||
        "Google Cloud Vision could not read the image.",
    );
  }

  return annotation?.fullTextAnnotation?.text?.trim() ?? "";
}
