import { describe, expect, test } from "bun:test";
import type { UIMessage } from "@tanstack/ai-client";
import {
  chatSessionsStorageKey,
  type ChatSession,
  mergeChatSessions,
  persistStoredSessions,
  readStoredSessions,
  writeStoredSessions,
} from "./chat-sessions";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const message: UIMessage = {
  id: "user-1",
  role: "user",
  parts: [{ type: "text", content: "hello" }],
};

function session(id: string, updatedAt: number): ChatSession {
  return {
    id,
    title: id,
    messages: [message],
    messageModels: {},
    selectedModel: "model-a",
    createdAt: 1,
    updatedAt,
  };
}

describe("chat session storage", () => {
  test("rejects malformed nested UI messages", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      chatSessionsStorageKey,
      JSON.stringify({
        activeSessionId: "broken",
        sessions: [
          {
            id: "broken",
            title: "Broken",
            messages: [{ id: "message", role: "user" }],
          },
        ],
      }),
    );

    expect(readStoredSessions(storage, "model-a")).toBeNull();
  });

  test("merges distinct sessions and keeps the newest revision of each session", () => {
    expect(
      mergeChatSessions(
        [session("a", 3), session("b", 1)],
        [session("a", 2), session("c", 4)],
      ).map((item) => [item.id, item.updatedAt]),
    ).toEqual([
      ["a", 3],
      ["c", 4],
      ["b", 1],
    ]);
  });

  test("lets an incoming storage event win an equal-timestamp tie", () => {
    const local = { ...session("a", 3), title: "local" };
    const incoming = { ...session("a", 3), title: "incoming" };

    expect(mergeChatSessions([incoming], [local])[0].title).toBe("incoming");
  });

  test("keeps deleted sessions tombstoned instead of merging them back", () => {
    const storage = new MemoryStorage();
    writeStoredSessions(
      storage,
      "a",
      [session("a", 1), session("b", 1)],
      "model-a",
    );
    const written = writeStoredSessions(
      storage,
      "b",
      [session("b", 2)],
      "model-a",
      ["a"],
    );

    expect(written.sessions.map((item) => item.id)).toEqual(["b"]);
    expect(written.deletedSessionIds).toEqual(["a"]);
  });

  test("merges existing storage before writing instead of erasing another tab", () => {
    const storage = new MemoryStorage();
    writeStoredSessions(storage, "a", [session("a", 1)], "model-a");
    const written = writeStoredSessions(
      storage,
      "b",
      [session("b", 2)],
      "model-a",
    );

    expect(written.sessions.map((item) => item.id).sort()).toEqual(["a", "b"]);
    expect(written.revision).toBe(2);
  });

  test("serializes cross-tab writes with the Web Locks API", async () => {
    const storage = new MemoryStorage();
    let tail = Promise.resolve();
    let activeLocks = 0;
    let maxActiveLocks = 0;
    const requestedNames: string[] = [];
    const lockManager = {
      request<T>(name: string, callback: () => T | PromiseLike<T>) {
        requestedNames.push(name);
        const run = tail.then(async () => {
          activeLocks += 1;
          maxActiveLocks = Math.max(maxActiveLocks, activeLocks);
          await Promise.resolve();
          try {
            return await callback();
          } finally {
            activeLocks -= 1;
          }
        });
        tail = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      },
    };

    await Promise.all([
      persistStoredSessions(storage, "a", [session("a", 1)], "model-a", [], lockManager),
      persistStoredSessions(storage, "b", [session("b", 2)], "model-a", [], lockManager),
    ]);

    expect(maxActiveLocks).toBe(1);
    expect(new Set(requestedNames)).toEqual(
      new Set([`${chatSessionsStorageKey}:write`]),
    );
    expect(
      readStoredSessions(storage, "model-a")?.sessions.map((item) => item.id).sort(),
    ).toEqual(["a", "b"]);
  });
});
