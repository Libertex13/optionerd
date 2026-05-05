import "server-only";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model?: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

export interface OpenRouterResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-haiku-4.5";

export class OpenRouterError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function chat(req: OpenRouterRequest): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not configured");
  }

  const body = {
    model: req.model ?? DEFAULT_MODEL,
    messages: req.messages,
    temperature: req.temperature ?? 0.4,
    max_tokens: req.max_tokens ?? 320,
    ...(req.response_format ? { response_format: req.response_format } : {}),
  };

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://optionerd.com",
      "X-Title": "optionerd",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter request failed (${res.status}): ${errText.slice(0, 200)}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = json.choices?.[0]?.message?.content ?? "";
  if (!text) {
    throw new OpenRouterError("OpenRouter returned empty completion");
  }

  return {
    text: text.trim(),
    model: json.model ?? body.model,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
}
