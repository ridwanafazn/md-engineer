export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIResponse = {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  error?: { message?: string };
};

function extractJsonText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI tidak mengembalikan JSON yang valid.");
  return candidate.slice(start, end + 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postAiOnce(body: Record<string, unknown>): Promise<Response> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `AI gagal (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text.slice(0, 300);
    }
    throw new Error(message);
  }

  return response;
}

async function postAi(body: Record<string, unknown>): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await postAiOnce(body);
    } catch (caught) {
      lastError = caught;
      if (attempt < 3) await sleep(1_500 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI gagal setelah retry.");
}

export async function aiJson<T>(messages: ChatMessage[], sessionId: string, maxTokens = 12_000): Promise<T> {
  const content = await aiStream(messages, sessionId, () => undefined, maxTokens, true);
  return JSON.parse(extractJsonText(content)) as T;
}

export async function aiStream(
  messages: ChatMessage[],
  sessionId: string,
  onDelta: (delta: string) => void,
  maxTokens = 64_000,
  json = false,
): Promise<string> {
  const response = await postAi({
    messages,
    sessionId,
    stream: true,
    json,
    maxTokens,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const payload = (await response.json()) as OpenAIResponse;
    const content = payload.choices?.[0]?.message?.content ?? "";
    if (content) onDelta(content);
    return content;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream AI tidak tersedia.");

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string | null } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // Abaikan baris yang bukan JSON.
      }
    }
  }

  if (!full.trim()) {
    throw new Error("AI tidak mengembalikan konten. Coba generate ulang.");
  }

  return full;
}
