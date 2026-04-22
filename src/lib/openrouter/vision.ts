import "server-only";

/**
 * Minimal OpenRouter vision client. Sends an image + prompt, asks the model
 * to return JSON, parses and returns the result.
 *
 * Default model is cheap + fast (Gemini 2.5 Flash-Lite). Override via
 * OPENROUTER_VISION_MODEL env var to A/B test other vision models without
 * code changes.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export interface VisionCallOptions {
  /** base64-encoded image content (no data: prefix) */
  imageBase64: string;
  /** MIME type, e.g. "image/png" */
  mimeType: string;
  /** The instruction for what to extract */
  prompt: string;
  /** Override the default model */
  model?: string;
}

export interface VisionResult<T> {
  data: T;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function assertConfigured(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY missing. Set it in .env.local to enable vision features.",
    );
  }
  return key;
}

/**
 * Call OpenRouter with an image + prompt, expecting JSON back.
 * Throws on transport error, model error, or invalid JSON.
 */
export async function visionToJson<T>(
  opts: VisionCallOptions,
): Promise<VisionResult<T>> {
  const apiKey = assertConfigured();
  const model = opts.model ?? process.env.OPENROUTER_VISION_MODEL ?? DEFAULT_MODEL;

  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${opts.mimeType};base64,${opts.imageBase64}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://optionerd.com",
      "X-Title": "optioNerd",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${detail.slice(0, 500)}`);
  }

  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter response missing content");
  }

  let parsed: T;
  try {
    parsed = JSON.parse(content) as T;
  } catch (err) {
    // Some models wrap JSON in ```json fences — try stripping those.
    const cleaned = content
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "");
    try {
      parsed = JSON.parse(cleaned) as T;
    } catch {
      throw new Error(
        `Model returned non-JSON content: ${content.slice(0, 300)} — parse error: ${(err as Error).message}`,
      );
    }
  }

  return {
    data: parsed,
    model,
    usage: json?.usage,
  };
}
