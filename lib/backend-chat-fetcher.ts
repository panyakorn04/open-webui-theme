import { EventType, type StreamChunk } from "@tanstack/ai/client";
import type { ChatFetcher, UIMessage } from "@tanstack/ai-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const fallbackAiModel = "panyakorn-local:latest";
const defaultRequestTimeoutMs = 120_000;
const streamFallbackStatuses = new Set([404, 405, 415, 501]);

function parseModelList(value: string | undefined) {
  const models = value
    ?.split(",")
    .map((model) => model.trim())
    .filter(Boolean) ?? [];

  return models.length > 0 ? models : [fallbackAiModel];
}

export const availableAiModels = parseModelList(process.env.NEXT_PUBLIC_AI_MODELS);
export const defaultAiModel = availableAiModels[0] ?? fallbackAiModel;

type BackendChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type BackendChatResponse = {
  ok: boolean;
  data?: {
    model: string;
    message?: {
      role: "assistant" | "user" | "system";
      content: string;
    };
    done: boolean;
    usage?: {
      prompt_eval_count?: number;
      eval_count?: number;
    };
  };
  error?: {
    message?: string;
  };
};

type BackendChatFetcherOptions = {
  requestTimeoutMs?: number;
};

class StreamUnavailableError extends Error {}

export function apiUrl(path: string) {
  if (!apiBaseUrl) return path;
  return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function textFromUIMessage(message: UIMessage) {
  const texts: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text") texts.push(part.content);
  }
  return texts.join("\n").trim();
}

function backendMessagesFromUI(messages: UIMessage[]): BackendChatMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: textFromUIMessage(message),
    }))
    .filter((message): message is BackendChatMessage =>
      (message.role === "system" || message.role === "user" || message.role === "assistant") && message.content !== "",
    )
    .slice(-10);
}

export function createBackendChatFetcher(
  getModel: () => string,
  options: BackendChatFetcherOptions = {},
): ChatFetcher {
  return ({ messages, runId, threadId }, { signal }) =>
    streamBackendChatWithFallback(
      messages as UIMessage[],
      runId,
      threadId,
      signal,
      getModel(),
      options.requestTimeoutMs ?? defaultRequestTimeoutMs,
    );
}

async function* streamBackendChatWithFallback(
  messages: UIMessage[],
  runId: string,
  threadId: string,
  externalSignal: AbortSignal,
  model: string,
  requestTimeoutMs: number,
): AsyncIterable<StreamChunk> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(externalSignal.reason);
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("AI request timed out.", "TimeoutError")),
    requestTimeoutMs,
  );

  if (externalSignal.aborted) abortFromCaller();
  else externalSignal.addEventListener("abort", abortFromCaller, { once: true });

  try {
    try {
      yield* streamBackendChat(messages, runId, threadId, controller.signal, model);
    } catch (error) {
      if (externalSignal.aborted) return;
      if (controller.signal.aborted) {
        throw new Error("AI request timed out.", { cause: error });
      }
      if (!(error instanceof StreamUnavailableError)) throw error;

      yield* streamBackendChatFallback(messages, runId, threadId, controller.signal, model);
    }
  } finally {
    clearTimeout(timeoutId);
    externalSignal.removeEventListener("abort", abortFromCaller);
  }
}

async function* streamBackendChat(
  messages: UIMessage[],
  runId: string,
  threadId: string,
  signal: AbortSignal,
  model: string,
): AsyncIterable<StreamChunk> {
  const response = await fetch(apiUrl("/api/ai/chat/stream"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: backendMessagesFromUI(messages),
      runId,
      threadId,
    }),
    signal,
  });

  if (!response.ok) {
    const message = await responseErrorMessage(response);
    if (streamFallbackStatuses.has(response.status)) {
      throw new StreamUnavailableError(message);
    }
    throw new Error(message);
  }
  if (!response.body) {
    throw new StreamUnavailableError("AI stream response did not include a body.");
  }

  for await (const chunk of parseSSEStream(response.body, signal)) {
    yield chunk;
  }
}

async function responseErrorMessage(response: Response) {
  try {
    const result = (await response.json()) as BackendChatResponse;
    return result.error?.message ?? `AI request failed (${response.status})`;
  } catch {
    return `AI request failed (${response.status})`;
  }
}

async function* parseSSEStream(body: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncIterable<StreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let readerDone = false;
  let streamCompleted = false;
  const eventBoundary = /(?:\r\n|\r|\n){2}/;

  function takeCompleteEvents() {
    const events: string[] = [];
    let match = eventBoundary.exec(buffer);
    while (match?.index !== undefined) {
      events.push(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
      match = eventBoundary.exec(buffer);
    }
    return events;
  }

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        readerDone = true;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      for (const event of takeCompleteEvents()) {
        const chunk = parseSSEEvent(event);
        if (!chunk) continue;
        streamCompleted ||= chunk.type === EventType.RUN_FINISHED || chunk.type === EventType.RUN_ERROR;
        yield chunk;
      }
    }

    if (signal.aborted) return;

    buffer += decoder.decode();
    for (const event of takeCompleteEvents()) {
      const chunk = parseSSEEvent(event);
      if (!chunk) continue;
      streamCompleted ||= chunk.type === EventType.RUN_FINISHED || chunk.type === EventType.RUN_ERROR;
      yield chunk;
    }
    if (buffer.trim() !== "") {
      throw new Error("AI stream ended before completing an SSE event.");
    }
    if (!streamCompleted) {
      throw new Error("AI stream ended before a completion event.");
    }
  } finally {
    if (!readerDone && !signal.aborted) {
      try {
        await reader.cancel();
      } catch {
        // The stream may already be closed; release the reader below either way.
      }
    }
    reader.releaseLock();
  }
}

function parseSSEEvent(event: string): StreamChunk | null {
  const data = event
    .split(/\r\n|\r|\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;
  try {
    return JSON.parse(data) as StreamChunk;
  } catch {
    return null;
  }
}

async function* streamBackendChatFallback(
  messages: UIMessage[],
  runId: string,
  threadId: string,
  signal: AbortSignal,
  model: string,
): AsyncIterable<StreamChunk> {
  const startedAt = Date.now();
  const messageId = `assistant-${runId}`;

  yield {
    type: EventType.RUN_STARTED,
    timestamp: startedAt,
    runId,
    threadId,
    model,
  } as StreamChunk;

  try {
    const response = await fetch(apiUrl("/api/ai/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: backendMessagesFromUI(messages) }),
      signal,
    });

    const result = (await response.json()) as BackendChatResponse;
    if (!response.ok || !result.ok || !result.data?.message?.content) {
      throw new Error(result.error?.message ?? `AI request failed (${response.status})`);
    }

    const content = result.data.message.content;

    yield {
      type: EventType.TEXT_MESSAGE_START,
      timestamp: Date.now(),
      messageId,
      role: "assistant",
      model: result.data.model,
    } as StreamChunk;

    yield {
      type: EventType.TEXT_MESSAGE_CONTENT,
      timestamp: Date.now(),
      messageId,
      delta: content,
      content,
      model: result.data.model,
    } as StreamChunk;

    yield {
      type: EventType.TEXT_MESSAGE_END,
      timestamp: Date.now(),
      messageId,
      model: result.data.model,
    } as StreamChunk;

    yield {
      type: EventType.RUN_FINISHED,
      timestamp: Date.now(),
      runId,
      threadId,
      model: result.data.model,
      usage: {
        promptTokens: result.data.usage?.prompt_eval_count,
        completionTokens: result.data.usage?.eval_count,
      },
    } as StreamChunk;
  } catch (error) {
    if (signal.aborted) {
      if (signal.reason instanceof DOMException && signal.reason.name === "TimeoutError") {
        yield {
          type: EventType.RUN_ERROR,
          timestamp: Date.now(),
          runId,
          threadId,
          model,
          message: "AI request timed out.",
          code: "BACKEND_CHAT_TIMEOUT",
        } as StreamChunk;
      }
      return;
    }

    yield {
      type: EventType.RUN_ERROR,
      timestamp: Date.now(),
      runId,
      threadId,
      model,
      message: error instanceof Error ? error.message : "Unable to send prompt.",
      code: "BACKEND_CHAT_ERROR",
    } as StreamChunk;
  }
}
