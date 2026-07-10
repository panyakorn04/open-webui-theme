"use client";

import { type UIMessage, useChat } from "@tanstack/ai-react";
import {
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    apiUrl,
    availableAiModels,
    createBackendChatFetcher,
    defaultAiModel,
} from "../lib/backend-chat-fetcher";
import {
    chatSessionsStorageKey,
    type ChatSession,
    mergeChatSessions,
    persistStoredSessions,
    readStoredSessions,
} from "../lib/chat-sessions";

const skills = [
    "portfolio-2026",
    "vps-ai-services",
    "youtube-highlight-automation",
];

const quickPrompts = [
    "ตรวจ docker compose ของ Open WebUI",
    "สรุป deployment checklist",
    "ช่วยเขียน n8n prompt สำหรับ highlight",
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const initialMessages: UIMessage[] = [];

function supportedModel(model: string) {
    return availableAiModels.includes(model) ? model : defaultAiModel;
}

function newSessionId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createChatSession(selectedModel = defaultAiModel, title = "New chat"): ChatSession {
    const now = Date.now();
    return {
        id: newSessionId(),
        title,
        messages: initialMessages,
        messageModels: {},
        selectedModel,
        createdAt: now,
        updatedAt: now,
    };
}

function messageText(message: UIMessage) {
    const texts: string[] = [];
    for (const part of message.parts) {
        if (part.type === "text") texts.push(part.content);
    }
    return texts.join("\n");
}

function messageMeta(
    message: UIMessage,
    selectedModel: string,
    messageModels: Record<string, string>,
) {
    if (message.id === "welcome") return "Panyakorn AI";
    return message.role === "assistant"
        ? (messageModels[message.id] ?? selectedModel)
        : "You";
}

function sessionTitleFromMessages(messages: UIMessage[]) {
    const firstUserMessage = messages.find(
        (message) => message.role === "user",
    );
    const text = firstUserMessage ? messageText(firstUserMessage).trim() : "";
    if (!text) return "New chat";
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

/* ── SVG Icons ─────────────────────────────────────── */
function IconPlus() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M12 5v14M5 12h14" />
        </svg>
    );
}

function IconArrowUp() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
    );
}

function IconMenu() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
    );
}

function IconX() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5M14 11v5" />
        </svg>
    );
}

const ambientBg = <div className="ambient" aria-hidden="true" />;

/* ── Sub-components ───────────────────────────────── */
function Sidebar({
    sortedSessions,
    activeSessionId,
    isLoading,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    startNewChat,
    openSession,
    deleteSession,
    selectedModel,
    isMobile,
    sidebarRef,
    closeButtonRef,
}: {
    sortedSessions: ChatSession[];
    activeSessionId: string;
    isLoading: boolean;
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (v: boolean) => void;
    startNewChat: () => void;
    openSession: (session: ChatSession) => void;
    deleteSession: (session: ChatSession) => void;
    selectedModel: string;
    isMobile: boolean;
    sidebarRef: RefObject<HTMLElement | null>;
    closeButtonRef: RefObject<HTMLButtonElement | null>;
}) {
    return (
        <aside
            ref={sidebarRef}
            id="workspace-sidebar"
            className={`sidebar${mobileDrawerOpen ? " open" : ""}`}
            aria-label="Workspace navigation"
            role={mobileDrawerOpen ? "dialog" : undefined}
            aria-modal={mobileDrawerOpen ? "true" : undefined}
            inert={isMobile && !mobileDrawerOpen}
        >
            <div className="brand-card">
                <div className="brand-mark" aria-hidden="true">
                    PK
                </div>
                <div className="brand-info">
                    <p className="eyebrow">PANYAKORN</p>
                    <h1>AI Console</h1>
                </div>
                <button
                    ref={closeButtonRef}
                    className="drawer-close"
                    type="button"
                    aria-label="Close navigation drawer"
                    onClick={() => setMobileDrawerOpen(false)}
                >
                    <IconX />
                </button>
            </div>

            <button
                className="new-chat"
                type="button"
                onClick={startNewChat}
                disabled={isLoading}
            >
                <IconPlus />
                New chat
            </button>

            <nav className="nav-section" aria-label="Recent conversations">
                <p className="section-label">Recent</p>
                <div className="conversation-list">
                    {sortedSessions.map((session) => {
                        const active = session.id === activeSessionId;
                        return (
                            <div
                                key={session.id}
                                className={
                                    active
                                        ? "conversation-row active"
                                        : "conversation-row"
                                }
                            >
                                <button
                                    className={
                                        active
                                            ? "conversation active"
                                            : "conversation"
                                    }
                                    type="button"
                                    aria-current={active ? "page" : undefined}
                                    disabled={isLoading && !active}
                                    title={session.title}
                                    onClick={() => openSession(session)}
                                >
                                    <span
                                        className={
                                            active ? "dot" : "dot dot-dim"
                                        }
                                        aria-hidden="true"
                                    />
                                    <span className="conversation-title">
                                        {session.title}
                                    </span>
                                </button>
                                <button
                                    className="delete-conversation"
                                    type="button"
                                    aria-label={`Delete recent chat: ${session.title}`}
                                    title="Delete recent"
                                    disabled={isLoading}
                                    onClick={() => deleteSession(session)}
                                >
                                    <IconTrash />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </nav>

            <div className="nav-section bottom">
                <p className="section-label">Model</p>
                <div className="model-card">
                    <span className="status-dot" aria-hidden="true" />
                    <div>
                        <strong>{selectedModel}</strong>
                        <span>Ollama internal · selectable</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function MessageList({
    messages,
    isLoading,
    error,
    messagesEndRef,
    messagesContainerRef,
    onMessagesScroll,
    selectedModel,
    messageModels,
}: {
    messages: UIMessage[];
    isLoading: boolean;
    error: Error | undefined | null;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    onMessagesScroll: () => void;
    selectedModel: string;
    messageModels: Record<string, string>;
}) {
    return (
        <div
            className="messages"
            ref={messagesContainerRef}
            onScroll={onMessagesScroll}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
        >
            {messages.map((message) => {
                const content = messageText(message);
                if (!content) return null;

                return (
                    <article
                        key={message.id}
                        className={
                            message.role === "user"
                                ? "message user"
                                : "message assistant"
                        }
                    >
                        {message.role === "assistant" && (
                            <span
                                className="avatar ai-avatar"
                                aria-hidden="true"
                            >
                                AI
                            </span>
                        )}
                        <div className="bubble">
                            <p className="message-meta">
                                {messageMeta(
                                    message,
                                    selectedModel,
                                    messageModels,
                                )}
                            </p>
                            <p>{content}</p>
                        </div>
                        {message.role === "user" && (
                            <span
                                className="avatar user-avatar"
                                aria-hidden="true"
                            >
                                PB
                            </span>
                        )}
                    </article>
                );
            })}

            {isLoading && (
                <article
                    className="message assistant"
                    aria-label="AI is thinking"
                >
                    <span className="avatar ai-avatar" aria-hidden="true">
                        AI
                    </span>
                    <div className="bubble">
                        <p className="message-meta">Thinking</p>
                        <div className="typing-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                </article>
            )}

            {error && (
                <article className="message assistant">
                    <span className="avatar ai-avatar" aria-hidden="true">
                        AI
                    </span>
                    <div className="bubble">
                        <p className="message-meta">API error</p>
                        <p>
                            ขออภัยครับ เรียก backend AI ไม่สำเร็จ:{" "}
                            {error.message}
                        </p>
                    </div>
                </article>
            )}

            <div ref={messagesEndRef} aria-hidden="true" />
        </div>
    );
}

function QuickPrompts({
    isLoading,
    sendPrompt,
}: {
    isLoading: boolean;
    sendPrompt: (nextPrompt: string) => Promise<void>;
}) {
    return (
        <div className="quick-prompts">
            {quickPrompts.map((qp) => (
                <button
                    key={qp}
                    type="button"
                    onClick={() => void sendPrompt(qp)}
                    disabled={isLoading}
                >
                    {qp}
                </button>
            ))}
        </div>
    );
}

function ComposerForm({
    prompt,
    setPrompt,
    isLoading,
    selectedModel,
    setSelectedModel,
    stopGeneration,
    handleSubmit,
    handleKeyDown,
}: {
    prompt: string;
    setPrompt: (nextPrompt: string) => void;
    isLoading: boolean;
    selectedModel: string;
    setSelectedModel: (nextModel: string) => void;
    stopGeneration: () => void;
    handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
    handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
    return (
        <form className="composer" onSubmit={handleSubmit}>
            <textarea
                aria-label="Prompt — press Enter to send, Shift+Enter for new line"
                placeholder="พิมพ์ข้อความ… (Enter ส่ง / Shift+Enter ขึ้นบรรทัด)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />
            <div className="composer-toolbar">
                <label className="composer-model-select">
                    <span>Model</span>
                    <select
                        value={selectedModel}
                        onChange={(event) =>
                            setSelectedModel(event.target.value)
                        }
                        disabled={isLoading}
                        aria-label="Select AI model"
                    >
                        {availableAiModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    className={`send-btn${isLoading ? " stop-btn" : ""}`}
                    type={isLoading ? "button" : "submit"}
                    disabled={!isLoading && prompt.trim() === ""}
                    aria-label={isLoading ? "Stop generation" : "Send message"}
                    onClick={isLoading ? stopGeneration : undefined}
                >
                    {isLoading ? <IconX /> : <IconArrowUp />}
                </button>
            </div>
        </form>
    );
}

function ContextPanel({
    error,
    selectedModel,
    inert,
    hasConnected,
}: {
    error: Error | undefined | null;
    selectedModel: string;
    inert: boolean;
    hasConnected: boolean;
}) {
    return (
        <aside
            className="context-panel"
            aria-label="Context and skills"
            inert={inert}
        >


            <section className="glass-card glow-card">
                <p className="eyebrow">Live wiring</p>
                <h3>Frontend → TanStack AI → Backend → Ollama</h3>
                <div className="token-grid" aria-hidden="true">
                    <span style={{ background: "rgba(34,197,94,0.08)" }} />
                    <span style={{ background: "rgba(34,197,94,0.16)" }} />
                    <span style={{ background: "rgba(34,197,94,0.55)" }} />
                    <span style={{ background: "rgba(34,197,94,0.30)" }} />
                </div>
                <div className="connection-row">
                    <span className="conn-label">API status</span>
                    <span className="conn-status">
                        {error
                            ? "● Error"
                            : hasConnected
                              ? "● Online"
                              : "● Not checked"}
                    </span>
                </div>
            </section>

            <section className="glass-card">
                <p className="section-label">Attached skills</p>
                <div className="skill-list">
                    {skills.map((s) => (
                        <div className="skill-chip" key={s}>
                            <span className="skill-chip-hash" aria-hidden="true">
                                #
                            </span>
                            {s}
                        </div>
                    ))}
                </div>
            </section>

            <section className="glass-card terminal-card">
                <p className="section-label">Runtime</p>
                <code>
                    NEXT_PUBLIC_API_URL={apiBaseUrl || "same-origin"}
                </code>
                <code>AI_CLIENT=TanStack AI SSE stream</code>
                <code>CHAT_SESSIONS=localStorage</code>
                <code>BACKEND_MODEL={selectedModel}</code>
                <code>OLLAMA_URL=internal://ollama:11434</code>
            </section>
        </aside>
    );
}

/* ── Component ─────────────────────────────────────── */
export default function Home() {
    const defaultSessionRef = useRef<ChatSession>(null!);
    if (defaultSessionRef.current === null) {
        defaultSessionRef.current = createChatSession();
    }

    const [prompt, setPrompt] = useState("");
    const [sessions, setSessions] = useState<ChatSession[]>([
        defaultSessionRef.current,
    ]);
    const [activeSessionId, setActiveSessionId] = useState(
        defaultSessionRef.current.id,
    );
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [selectedModel, setSelectedModel] = useState(defaultAiModel);
    const [hasConnected, setHasConnected] = useState(false);
    const [chatClientEpoch, setChatClientEpoch] = useState(0);

    const hasLoadedStoredSessionsRef = useRef(false);
    const lastChatSessionRef = useRef(activeSessionId);
    const selectedModelRef = useRef(selectedModel);
    selectedModelRef.current = selectedModel;

    const activeSession = useMemo(
        () => sessions.find((session) => session.id === activeSessionId),
        [activeSessionId, sessions],
    );
    const chatFetcher = useMemo(
        () => createBackendChatFetcher(() => selectedModelRef.current),
        [],
    );
    const {
        error,
        isLoading,
        messages,
        sendMessage,
        stop: stopGeneration,
    } = useChat({
        id: `${activeSessionId}:${chatClientEpoch}`,
        threadId: activeSessionId,
        fetcher: chatFetcher,
        initialMessages: activeSession?.messages ?? initialMessages,
        devtools: { name: "Panyakorn AI Console" },
        onFinish: (message) => {
            setHasConnected(true);
            const responseModel = selectedModelRef.current;
            setSessions((currentSessions) =>
                currentSessions.map((session) =>
                    session.id === activeSessionId
                        ? {
                              ...session,
                              messageModels: {
                                  ...session.messageModels,
                                  [message.id]: responseModel,
                              },
                              selectedModel: responseModel,
                              updatedAt: Date.now(),
                          }
                        : session,
                ),
            );
        },
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const sidebarRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const sessionsRef = useRef(sessions);
    const messagesRef = useRef(messages);
    sessionsRef.current = sessions;
    messagesRef.current = messages;

    const syncCurrentMessages = useCallback(
        (currentSessions: ChatSession[]) =>
            currentSessions.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          title: sessionTitleFromMessages(messages),
                          messages,
                          selectedModel,
                          updatedAt: Date.now(),
                      }
                    : session,
            ),
        [activeSessionId, messages, selectedModel],
    );

    useEffect(() => {
        function syncVisualViewportHeight() {
            const height = window.visualViewport?.height ?? window.innerHeight;
            document.documentElement.style.setProperty(
                "--visual-viewport-height",
                `${height}px`,
            );
        }

        syncVisualViewportHeight();
        window.visualViewport?.addEventListener(
            "resize",
            syncVisualViewportHeight,
        );
        window.visualViewport?.addEventListener(
            "scroll",
            syncVisualViewportHeight,
            { passive: true },
        );
        window.addEventListener("resize", syncVisualViewportHeight);

        return () => {
            window.visualViewport?.removeEventListener(
                "resize",
                syncVisualViewportHeight,
            );
            window.visualViewport?.removeEventListener(
                "scroll",
                syncVisualViewportHeight,
            );
            window.removeEventListener("resize", syncVisualViewportHeight);
        };
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 900px)");
        const syncMobileState = () => {
            setIsMobile(mediaQuery.matches);
            if (!mediaQuery.matches) setMobileDrawerOpen(false);
        };
        syncMobileState();
        mediaQuery.addEventListener("change", syncMobileState);
        return () => mediaQuery.removeEventListener("change", syncMobileState);
    }, []);

    useEffect(() => {
        document.body.classList.toggle("drawer-open", mobileDrawerOpen);
        if (!mobileDrawerOpen) return () => document.body.classList.remove("drawer-open");

        const previousFocus = document.activeElement as HTMLElement | null;
        const sidebar = sidebarRef.current;
        closeButtonRef.current?.focus();

        function handleDrawerKeyDown(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") {
                setMobileDrawerOpen(false);
                return;
            }
            if (event.key !== "Tab" || !sidebar) return;

            const focusable = [...sidebar.querySelectorAll<HTMLElement>(
                'button:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
            )].filter((element) => !element.hasAttribute("inert"));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable.at(-1)!;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        window.addEventListener("keydown", handleDrawerKeyDown);
        return () => {
            window.removeEventListener("keydown", handleDrawerKeyDown);
            document.body.classList.remove("drawer-open");
            (previousFocus ?? menuButtonRef.current)?.focus();
        };
    }, [mobileDrawerOpen]);

    useEffect(() => {
        const stored = readStoredSessions(window.localStorage, defaultAiModel);
        if (stored) {
            const storedActiveSession =
                stored.sessions.find(
                    (session) => session.id === stored.activeSessionId,
                ) ?? stored.sessions[0];
            setSessions(stored.sessions);
            setActiveSessionId(storedActiveSession.id);
            setSelectedModel(supportedModel(storedActiveSession.selectedModel));
        }
        hasLoadedStoredSessionsRef.current = true;
    }, []);

    useEffect(() => {
        function syncOtherTabs(event: StorageEvent) {
            if (event.key !== chatSessionsStorageKey) return;
            const stored = readStoredSessions(window.localStorage, defaultAiModel);
            if (!stored) return;
            const incomingActiveSession = stored.sessions.find(
                (session) => session.id === activeSessionId,
            );
            const localActiveSession = sessionsRef.current.find(
                (session) => session.id === activeSessionId,
            );
            const activeSessionChanged =
                incomingActiveSession !== undefined &&
                (localActiveSession === undefined ||
                    (incomingActiveSession.updatedAt >= localActiveSession.updatedAt &&
                        JSON.stringify(incomingActiveSession) !==
                            JSON.stringify(localActiveSession)));

            if (stored.deletedSessionIds.includes(activeSessionId)) {
                const nextActiveSession =
                    stored.sessions.find(
                        (session) => session.id === stored.activeSessionId,
                    ) ?? stored.sessions[0];
                if (isLoading) stopGeneration();
                setActiveSessionId(nextActiveSession.id);
                setSelectedModel(supportedModel(nextActiveSession.selectedModel));
            } else if (activeSessionChanged) {
                if (isLoading) stopGeneration();
                setSelectedModel(supportedModel(incomingActiveSession.selectedModel));
                setChatClientEpoch((currentEpoch) => currentEpoch + 1);
            }
            setSessions((currentSessions) =>
                mergeChatSessions(
                    stored.sessions,
                    currentSessions.filter(
                        (session) =>
                            !stored.deletedSessionIds.includes(session.id),
                    ),
                ),
            );
        }
        window.addEventListener("storage", syncOtherTabs);
        return () => window.removeEventListener("storage", syncOtherTabs);
    }, [activeSessionId, isLoading, stopGeneration]);

    useEffect(() => {
        if (!hasLoadedStoredSessionsRef.current) return;
        if (lastChatSessionRef.current !== activeSessionId) {
            lastChatSessionRef.current = activeSessionId;
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSessions((currentSessions) => syncCurrentMessages(currentSessions));
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [activeSessionId, messages, syncCurrentMessages]);

    useEffect(() => {
        if (!hasLoadedStoredSessionsRef.current) return;
        const timeoutId = window.setTimeout(() => {
            void persistStoredSessions(
                window.localStorage,
                activeSessionId,
                sessions,
                defaultAiModel,
            ).catch(() => {
                // Chat stays usable when storage is unavailable or over quota.
            });
        }, 500);
        return () => window.clearTimeout(timeoutId);
    }, [activeSessionId, sessions]);

    useEffect(() => {
        function flushSession() {
            const current = sessionsRef.current.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          title: sessionTitleFromMessages(messagesRef.current),
                          messages: messagesRef.current,
                          selectedModel: selectedModelRef.current,
                          updatedAt: Date.now(),
                      }
                    : session,
            );
            void persistStoredSessions(
                window.localStorage,
                activeSessionId,
                current,
                defaultAiModel,
            ).catch(() => {
                // Ignore best-effort lifecycle persistence failures.
            });
        }
        function flushWhenHidden() {
            if (document.visibilityState === "hidden") flushSession();
        }
        document.addEventListener("visibilitychange", flushWhenHidden);
        window.addEventListener("pagehide", flushSession);
        return () => {
            document.removeEventListener("visibilitychange", flushWhenHidden);
            window.removeEventListener("pagehide", flushSession);
        };
    }, [activeSessionId]);

    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        messagesEndRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
        });
    }, [messages, isLoading]);

    const sortedSessions = useMemo(
        () => sessions.toSorted((a, b) => b.updatedAt - a.updatedAt),
        [sessions],
    );

    const statusLabel = isLoading
        ? "Thinking…"
        : error
          ? "API error"
          : hasConnected
            ? "Connected"
            : "Not checked";
    const hasStartedConversation = messages.some(
        (message) => message.role === "user" || message.id !== "welcome",
    );
    const showEmptyState = !hasStartedConversation && !isLoading && !error;

    function handleMessagesScroll() {
        const container = messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldAutoScrollRef.current = distanceFromBottom < 160;
    }

    async function sendPrompt(nextPrompt: string) {
        const trimmed = nextPrompt.trim();
        if (!trimmed || isLoading) return;
        shouldAutoScrollRef.current = true;
        setPrompt("");
        await sendMessage(trimmed);
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        void sendPrompt(prompt);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendPrompt(prompt);
        }
    }

    function handleSelectedModelChange(nextModel: string) {
        setSelectedModel(nextModel);
        setSessions((currentSessions) =>
            currentSessions.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          selectedModel: nextModel,
                          updatedAt: Date.now(),
                      }
                    : session,
            ),
        );
    }

    function startNewChat() {
        if (isLoading) return;
        const nextSession = createChatSession(selectedModel);
        setSessions((currentSessions) => [
            nextSession,
            ...syncCurrentMessages(currentSessions),
        ]);
        setActiveSessionId(nextSession.id);
        setPrompt("");
        setMobileDrawerOpen(false);
    }

    function openSession(session: ChatSession) {
        if (isLoading || session.id === activeSessionId) return;
        setSessions((currentSessions) => syncCurrentMessages(currentSessions));
        setActiveSessionId(session.id);
        setSelectedModel(supportedModel(session.selectedModel));
        setPrompt("");
        setMobileDrawerOpen(false);
    }

    function deleteSession(sessionToDelete: ChatSession) {
        if (isLoading) return;

        const currentSessions = syncCurrentMessages(sessions);
        const remainingSessions = currentSessions.filter(
            (session) => session.id !== sessionToDelete.id,
        );
        const nextSessions = remainingSessions.length
            ? remainingSessions
            : [createChatSession(selectedModel)];

        const deletingActiveSession = sessionToDelete.id === activeSessionId;
        const nextActiveSession = deletingActiveSession
            ? nextSessions.toSorted((a, b) => b.updatedAt - a.updatedAt)[0]
            : nextSessions.find((session) => session.id === activeSessionId) ??
              nextSessions[0];

        setSessions(nextSessions);
        void persistStoredSessions(
            window.localStorage,
            nextActiveSession.id,
            nextSessions,
            defaultAiModel,
            [sessionToDelete.id],
        ).catch(() => {
            // Keep the in-memory deletion when storage is unavailable.
        });

        if (deletingActiveSession) {
            setActiveSessionId(nextActiveSession.id);
            setSelectedModel(supportedModel(nextActiveSession.selectedModel));
            setPrompt("");
            setMobileDrawerOpen(false);
        }
    }

    return (
        <>
            {/* Ambient background blobs */}
            {ambientBg}

            <main className="app-shell">
                <button
                    className="drawer-backdrop"
                    type="button"
                    aria-label="Close navigation drawer"
                    tabIndex={mobileDrawerOpen ? 0 : -1}
                    onClick={() => setMobileDrawerOpen(false)}
                />

                {/* ── Sidebar ─────────────────────────────── */}
                <Sidebar
                    sortedSessions={sortedSessions}
                    activeSessionId={activeSessionId}
                    isLoading={isLoading}
                    mobileDrawerOpen={mobileDrawerOpen}
                    setMobileDrawerOpen={setMobileDrawerOpen}
                    startNewChat={startNewChat}
                    openSession={openSession}
                    deleteSession={deleteSession}
                    selectedModel={selectedModel}
                    isMobile={isMobile}
                    sidebarRef={sidebarRef}
                    closeButtonRef={closeButtonRef}
                />

                {/* ── Chat Panel ──────────────────────────── */}
                <section
                    className={`chat-panel${showEmptyState ? " empty" : ""}`}
                    aria-label="AI chat"
                    inert={mobileDrawerOpen}
                >
                    {/* Topbar */}
                    <header className="topbar">
                        <button
                            ref={menuButtonRef}
                            className="mobile-menu-toggle"
                            type="button"
                            aria-label="Open navigation drawer"
                            aria-expanded={mobileDrawerOpen}
                            aria-controls="workspace-sidebar"
                            onClick={() => setMobileDrawerOpen(true)}
                        >
                            <IconMenu />
                        </button>
                        <div className="topbar-title">
                            <p className="eyebrow">
                                {hasConnected ? "Backend API Connected" : "Backend API Not Checked"}
                            </p>
                            <h2>{activeSession?.title ?? "New chat"}</h2>
                        </div>
                        <div
                            className="topbar-actions"
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            <span
                                className={`pill${isLoading ? " thinking" : ""}`}
                            >
                                <span className="pill-dot" aria-hidden="true" />
                                {statusLabel}
                            </span>
                        </div>
                    </header>

                    {showEmptyState ? (
                        <div className="empty-state">
                            <div className="empty-state-inner">
                                <h2>
                                    You can start when you're ready.
                                </h2>
                                <div className="composer-card empty-composer-card">
                                    <ComposerForm
                                        prompt={prompt}
                                        setPrompt={setPrompt}
                                        isLoading={isLoading}
                                        selectedModel={selectedModel}
                                        setSelectedModel={handleSelectedModelChange}
                                        stopGeneration={stopGeneration}
                                        handleSubmit={handleSubmit}
                                        handleKeyDown={handleKeyDown}
                                    />
                                    <QuickPrompts
                                        isLoading={isLoading}
                                        sendPrompt={sendPrompt}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Hero strip */}
                            <div className="hero-strip">
                                <div>
                                    <span className="terminal-label">
                                        {apiUrl("/api/ai/chat/stream")}
                                    </span>
                                    <h3>
                                        Private AI workspace for coding,
                                        automation &amp; VPS ops.
                                    </h3>
                                </div>
                                <div className="signal-card">
                                    <span>Backend status</span>
                                    <strong>
                                        {error ? "Check API" : "Ready"}
                                    </strong>
                                </div>
                            </div>

                            {/* Messages */}
                            <MessageList
                                messages={messages}
                                isLoading={isLoading}
                                error={error}
                                messagesEndRef={messagesEndRef}
                                messagesContainerRef={messagesContainerRef}
                                onMessagesScroll={handleMessagesScroll}
                                selectedModel={selectedModel}
                                messageModels={activeSession?.messageModels ?? {}}
                            />

                            {/* Composer */}
                            <div className="composer-card">
                                <ComposerForm
                                    prompt={prompt}
                                    setPrompt={setPrompt}
                                    isLoading={isLoading}
                                    selectedModel={selectedModel}
                                    setSelectedModel={handleSelectedModelChange}
                                    stopGeneration={stopGeneration}
                                    handleSubmit={handleSubmit}
                                    handleKeyDown={handleKeyDown}
                                />
                            </div>
                        </>
                    )}
                </section>

                {/* ── Context Panel ────────────────────────── */}
                <ContextPanel
                    error={error}
                    selectedModel={selectedModel}
                    inert={mobileDrawerOpen}
                    hasConnected={hasConnected}
                />
            </main>
        </>
    );
}
