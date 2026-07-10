import { afterEach, describe, expect, test } from "bun:test";
import { EventType } from "@tanstack/ai/client";
import type { ChatFetcher, UIMessage } from "@tanstack/ai-client";
import { createBackendChatFetcher } from "./backend-chat-fetcher";

const userMessages: UIMessage[] = [
  {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", content: "hello" }],
  },
];

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function consume(fetcher: ChatFetcher) {
  const chunks = [];
  const stream = fetcher(
    {
      messages: userMessages,
      runId: "run-1",
      threadId: "thread-1",
    },
    { signal: new AbortController().signal },
  ) as AsyncIterable<import("@tanstack/ai/client").StreamChunk>;

  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

function finishedEvent(lineEnding = "\n") {
  const payload = JSON.stringify({
    type: EventType.RUN_FINISHED,
    timestamp: 1,
    runId: "run-1",
    threadId: "thread-1",
  });
  return `data: ${payload}${lineEnding}${lineEnding}`;
}

describe("createBackendChatFetcher", () => {
  test("reads the selected model at request time", async () => {
    const requestedModels: string[] = [];
    let selectedModel = "model-a";

    globalThis.fetch = (async (
      _input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      requestedModels.push(body.model);
      return new Response(finishedEvent(), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }) as unknown as typeof fetch;

    const fetcher = createBackendChatFetcher(() => selectedModel);
    await consume(fetcher);
    selectedModel = "model-b";
    await consume(fetcher);

    expect(requestedModels).toEqual(["model-a", "model-b"]);
  });

  test("times out a stalled backend request", async () => {
    globalThis.fetch = ((
      _input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      })) as unknown as typeof fetch;

    const fetcher = createBackendChatFetcher(() => "model-a", {
      requestTimeoutMs: 5,
    });

    await expect(consume(fetcher)).rejects.toThrow("AI request timed out");
  });

  test("accepts CRLF-delimited SSE events", async () => {
    globalThis.fetch = (async () =>
      new Response(finishedEvent("\r\n"), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })) as unknown as typeof fetch;

    const chunks = await consume(createBackendChatFetcher(() => "model-a"));
    expect(chunks.at(-1)?.type).toBe(EventType.RUN_FINISHED);
  });

  test("skips a malformed SSE frame and continues to completion", async () => {
    globalThis.fetch = (async () =>
      new Response(`data: not-json\n\n${finishedEvent()}`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })) as unknown as typeof fetch;

    const chunks = await consume(createBackendChatFetcher(() => "model-a"));
    expect(chunks.at(-1)?.type).toBe(EventType.RUN_FINISHED);
  });

  test("falls back to the JSON endpoint when streaming is unsupported", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.endsWith("/stream")) {
        return new Response("not supported", { status: 404 });
      }

      return Response.json({
        ok: true,
        data: {
          model: "model-a",
          message: { role: "assistant", content: "fallback response" },
          done: true,
        },
      });
    }) as unknown as typeof fetch;

    const chunks = await consume(createBackendChatFetcher(() => "model-a"));

    expect(requestedUrls).toEqual(["/api/ai/chat/stream", "/api/ai/chat"]);
    expect(chunks.some((chunk) => chunk.type === EventType.TEXT_MESSAGE_CONTENT)).toBe(true);
    expect(chunks.at(-1)?.type).toBe(EventType.RUN_FINISHED);
  });

  test("emits a terminal error when the JSON fallback times out", async () => {
    globalThis.fetch = ((
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      if (String(input).endsWith("/stream")) {
        return Promise.resolve(new Response("not supported", { status: 404 }));
      }
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      });
    }) as unknown as typeof fetch;

    const chunks = await consume(
      createBackendChatFetcher(() => "model-a", { requestTimeoutMs: 5 }),
    );

    expect(chunks.at(-1)).toMatchObject({
      type: EventType.RUN_ERROR,
      message: "AI request timed out.",
    });
  });
});
