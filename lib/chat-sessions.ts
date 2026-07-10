import type { UIMessage } from "@tanstack/ai-client";

export const chatSessionsStorageKey = "panyakorn-ai-chat-sessions:v2";
const legacyChatSessionsStorageKey = "panyakorn-ai-chat-sessions:v1";

export type ChatSession = {
  id: string;
  title: string;
  messages: UIMessage[];
  messageModels: Record<string, string>;
  selectedModel: string;
  createdAt: number;
  updatedAt: number;
};

export type StoredChatSessions = {
  version: 2;
  revision: number;
  activeSessionId: string;
  sessions: ChatSession[];
  deletedSessionIds: string[];
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "getItem" | "setItem">;
type StorageLockManager = {
  request<T>(name: string, callback: () => T | PromiseLike<T>): Promise<T>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUIMessage(value: unknown): value is UIMessage {
  if (!isRecord(value) || typeof value.id !== "string") return false;
  if (value.role !== "system" && value.role !== "user" && value.role !== "assistant") return false;
  if (!Array.isArray(value.parts)) return false;

  return value.parts.every((part) => {
    if (!isRecord(part) || typeof part.type !== "string") return false;
    return part.type !== "text" || typeof part.content === "string";
  });
}

function normalizeMessageModels(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function normalizeSession(value: unknown, fallbackModel: string): ChatSession | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  if (!Array.isArray(value.messages) || !value.messages.every(isUIMessage)) return null;

  const now = Date.now();
  return {
    id: value.id,
    title: value.title,
    messages: value.messages,
    messageModels: normalizeMessageModels(value.messageModels),
    selectedModel: typeof value.selectedModel === "string" ? value.selectedModel : fallbackModel,
    createdAt: typeof value.createdAt === "number" && Number.isFinite(value.createdAt) ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : now,
  };
}

function parseStoredValue(raw: string | null, fallbackModel: string): StoredChatSessions | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.sessions)) return null;

    const sessions = parsed.sessions
      .map((session) => normalizeSession(session, fallbackModel))
      .filter((session): session is ChatSession => session !== null);
    if (sessions.length === 0) return null;

    const requestedActiveId = typeof parsed.activeSessionId === "string" ? parsed.activeSessionId : "";
    const activeSessionId = sessions.some((session) => session.id === requestedActiveId)
      ? requestedActiveId
      : sessions[0].id;

    return {
      version: 2,
      revision: typeof parsed.revision === "number" && Number.isFinite(parsed.revision) ? parsed.revision : 0,
      activeSessionId,
      sessions,
      deletedSessionIds: Array.isArray(parsed.deletedSessionIds)
        ? parsed.deletedSessionIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return null;
  }
}

export function readStoredSessions(storage: StorageReader, fallbackModel: string) {
  return (
    parseStoredValue(storage.getItem(chatSessionsStorageKey), fallbackModel) ??
    parseStoredValue(storage.getItem(legacyChatSessionsStorageKey), fallbackModel)
  );
}

export function mergeChatSessions(local: ChatSession[], stored: ChatSession[]) {
  const merged = new Map<string, ChatSession>();
  for (const session of [...stored, ...local]) {
    const existing = merged.get(session.id);
    if (!existing || session.updatedAt >= existing.updatedAt) merged.set(session.id, session);
  }
  return [...merged.values()];
}

export function writeStoredSessions(
  storage: StorageWriter,
  activeSessionId: string,
  sessions: ChatSession[],
  fallbackModel: string,
  deletedSessionIds: string[] = [],
) {
  const stored = readStoredSessions(storage, fallbackModel);
  const deletedIds = new Set([
    ...(stored?.deletedSessionIds ?? []),
    ...deletedSessionIds,
  ]);
  const mergedSessions = mergeChatSessions(sessions, stored?.sessions ?? []).filter(
    (session) => !deletedIds.has(session.id),
  );
  const nextActiveSessionId = mergedSessions.some((session) => session.id === activeSessionId)
    ? activeSessionId
    : mergedSessions[0]?.id ?? activeSessionId;
  const document: StoredChatSessions = {
    version: 2,
    revision: (stored?.revision ?? 0) + 1,
    activeSessionId: nextActiveSessionId,
    sessions: mergedSessions,
    deletedSessionIds: [...deletedIds],
  };
  storage.setItem(chatSessionsStorageKey, JSON.stringify(document));
  return document;
}

function browserLockManager(): StorageLockManager | undefined {
  if (typeof navigator === "undefined" || !("locks" in navigator)) return undefined;
  return navigator.locks as unknown as StorageLockManager;
}

export function persistStoredSessions(
  storage: StorageWriter,
  activeSessionId: string,
  sessions: ChatSession[],
  fallbackModel: string,
  deletedSessionIds: string[] = [],
  lockManager = browserLockManager(),
) {
  const write = () =>
    writeStoredSessions(
      storage,
      activeSessionId,
      sessions,
      fallbackModel,
      deletedSessionIds,
    );

  return lockManager
    ? lockManager.request(`${chatSessionsStorageKey}:write`, write)
    : Promise.resolve(write());
}
