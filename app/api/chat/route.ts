import { systemPrompt } from "@/lib/chat-prompt";

const MAX_BODY_BYTES = 32_000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 1_000;
const MAX_REPLY_TOKENS = 400;
const UPSTREAM_TIMEOUT_MS = 60_000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60_000;

type ChatMessage = { role: "user" | "assistant"; content: string };

const fail = (status: number, error: string) => Response.json({ error }, { status });

// Best effort: each server instance counts on its own and forgets on restart.
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
  const entry = hits.get(ip) ?? { count: 0, resetAt: now + RATE_WINDOW_MS };
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// Only visitor and assistant turns get through, so nobody can send a system message.
function parseMessages(body: unknown): ChatMessage[] | null {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;

  const parsed: ChatMessage[] = [];
  for (const message of messages) {
    const { role, content } = (message ?? {}) as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim() || content.length > MAX_MESSAGE_CHARS) return null;
    parsed.push({ role, content });
  }
  return parsed.at(-1)?.role === "user" ? parsed : null;
}

// Ollama streams one JSON object per line; pass on only the reply text.
function toTextStream(upstream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const emit = (line: string, controller: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.trim()) return;
    const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
    if (chunk.error) throw new Error(chunk.error);
    if (chunk.message?.content) controller.enqueue(encoder.encode(chunk.message.content));
  };

  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(bytes, controller) {
        buffer += decoder.decode(bytes, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) emit(line, controller);
      },
      flush(controller) {
        emit(buffer, controller);
      },
    }),
  );
}

export async function POST(request: Request) {
  const host = (process.env.OLLAMA_HOST || "https://ollama.com").replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || "gemma4:31b";
  const apiKey = process.env.OLLAMA_API_KEY;
  // Ollama Cloud needs the key. A local Ollama does not.
  if (!apiKey && host === "https://ollama.com") return fail(503, "Assistant is not configured.");

  if (!isSameOrigin(request)) return fail(403, "Forbidden.");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail(413, "Message too long.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return fail(429, "Too many messages.");

  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) return fail(400, "Invalid messages.");

  let upstream: Response;
  try {
    upstream = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        stream: true,
        think: false,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        options: { temperature: 0.3, num_predict: MAX_REPLY_TOKENS },
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
    });
  } catch (error) {
    console.error("Ollama request failed:", error);
    return fail(502, "Assistant is unavailable.");
  }

  if (!upstream.ok || !upstream.body) {
    // Details stay in the server log, never in the visitor's response.
    console.error(`Ollama returned ${upstream.status}:`, await upstream.text().catch(() => ""));
    return fail(502, "Assistant is unavailable.");
  }

  return new Response(toTextStream(upstream.body), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
