"use client";

import { type UIMessage, useChat } from "@tanstack/ai-react";
import {
    type FormEvent,
    type KeyboardEvent,
    type RefObject,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    aiModel,
    apiUrl,
    backendChatFetcher,
} from "../lib/backend-chat-fetcher";

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
const chatSessionsStorageKey = "panyakorn-ai-chat-sessions:v1";

const initialMessages: UIMessage[] = [
    {
        id: "welcome",
        role: "assistant",
        parts: [
            {
                type: "text",
                content:
                    "สวัสดีครับ ตอนนี้ AI Console เชื่อมกับ backend API และ Ollama local model แล้ว ลองพิมพ์คำถามได้เลยครับ",
            },
        ],
    },
];

type ChatSession = {
    id: string;
    title: string;
    messages: UIMessage[];
    createdAt: number;
    updatedAt: number;
};

function newSessionId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createChatSession(title = "New chat"): ChatSession {
    const now = Date.now();
    return {
        id: newSessionId(),
        title,
        messages: initialMessages,
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

function messageMeta(message: UIMessage) {
    if (message.id === "welcome") return "Panyakorn AI";
    return message.role === "assistant" ? aiModel : "You";
}

function sessionTitleFromMessages(messages: UIMessage[]) {
    const firstUserMessage = messages.find(
        (message) => message.role === "user",
    );
    const text = firstUserMessage ? messageText(firstUserMessage).trim() : "";
    if (!text) return "New chat";
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

function readStoredSessions() {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(chatSessionsStorageKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
            activeSessionId?: string;
            sessions?: ChatSession[];
        };
        const sessions = parsed.sessions?.filter(
            (session) =>
                typeof session.id === "string" &&
                typeof session.title === "string" &&
                Array.isArray(session.messages),
        );

        if (!sessions?.length) return null;
        return {
            activeSessionId: parsed.activeSessionId ?? sessions[0].id,
            sessions,
        };
    } catch {
        return null;
    }
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
}: {
    sortedSessions: ChatSession[];
    activeSessionId: string;
    isLoading: boolean;
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (v: boolean) => void;
    startNewChat: () => void;
    openSession: (session: ChatSession) => void;
}) {
    return (
        <aside
            id="workspace-sidebar"
            className={`sidebar${mobileDrawerOpen ? " open" : ""}`}
            aria-label="Workspace navigation"
            aria-modal={mobileDrawerOpen ? "true" : undefined}
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
                            <button
                                key={session.id}
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
                                {session.title}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="nav-section bottom">
                <p className="section-label">Model</p>
                <div className="model-card">
                    <span className="status-dot" aria-hidden="true" />
                    <div>
                        <strong>panyakorn-local</strong>
                        <span>{aiModel} · Ollama internal</span>
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
}: {
    messages: UIMessage[];
    isLoading: boolean;
    error: Error | undefined | null;
    messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
    return (
        <div
            className="messages"
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
                                {messageMeta(message)}
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

function ContextPanel({ error }: { error: Error | undefined | null }) {
    return (
        <aside className="context-panel" aria-label="Context and skills">


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
                        {error ? "● Error" : "● Online"}
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
                <code>BACKEND_MODEL={aiModel}</code>
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
    const hasLoadedStoredSessionsRef = useRef(false);
    const { error, isLoading, messages, sendMessage, setMessages } = useChat({
        fetcher: backendChatFetcher,
        initialMessages,
        devtools: { name: "Panyakorn AI Console" },
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        function handleEscape(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") {
                setMobileDrawerOpen(false);
            }
        }

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    useEffect(() => {
        document.body.classList.toggle("drawer-open", mobileDrawerOpen);
        return () => document.body.classList.remove("drawer-open");
    }, [mobileDrawerOpen]);

    useEffect(() => {
        const stored = readStoredSessions();
        if (stored) {
            const activeSession =
                stored.sessions.find(
                    (session) => session.id === stored.activeSessionId,
                ) ?? stored.sessions[0];

            setSessions(stored.sessions);
            setActiveSessionId(activeSession.id);
            setMessages(activeSession.messages);
        }

        hasLoadedStoredSessionsRef.current = true;
    }, [setMessages]);

    useEffect(() => {
        if (!hasLoadedStoredSessionsRef.current) return;

        setSessions((currentSessions) => {
            const updated = currentSessions.map((session) => {
                if (session.id !== activeSessionId) return session;
                return {
                    ...session,
                    title: sessionTitleFromMessages(messages),
                    messages,
                    updatedAt: Date.now(),
                };
            });

            try {
                window.localStorage.setItem(
                    chatSessionsStorageKey,
                    JSON.stringify({ activeSessionId, sessions: updated }),
                );
            } catch {
                // Ignore storage failures so chat remains usable in private mode/quota limits.
            }

            return updated;
        });
    }, [activeSessionId, messages]);

    /* Auto-scroll to bottom after every render that changes the message list */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    const activeSession = useMemo(
        () => sessions.find((session) => session.id === activeSessionId),
        [activeSessionId, sessions],
    );

    const sortedSessions = useMemo(
        () => sessions.toSorted((a, b) => b.updatedAt - a.updatedAt),
        [sessions],
    );

    const statusLabel =
        isLoading ? "Thinking…" : error ? "API error" : "Connected";

    async function sendPrompt(nextPrompt: string) {
        const trimmed = nextPrompt.trim();
        if (!trimmed || isLoading) return;

        setPrompt("");
        await sendMessage(trimmed);
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        void sendPrompt(prompt);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendPrompt(prompt);
        }
    }

    function startNewChat() {
        if (isLoading) return;

        const nextSession = createChatSession();
        setSessions((currentSessions) => [nextSession, ...currentSessions]);
        setActiveSessionId(nextSession.id);
        setMessages(nextSession.messages);
        setPrompt("");
        setMobileDrawerOpen(false);
    }

    function openSession(session: ChatSession) {
        if (isLoading || session.id === activeSessionId) return;

        setActiveSessionId(session.id);
        setMessages(session.messages);
        setPrompt("");
        setMobileDrawerOpen(false);
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
                />

                {/* ── Chat Panel ──────────────────────────── */}
                <section className="chat-panel" aria-label="AI chat">
                    {/* Topbar */}
                    <header className="topbar">
                        <button
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
                            <p className="eyebrow">Backend API Connected</p>
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
                            <span className="pill accent">
                                TanStack AI · {aiModel}
                            </span>
                        </div>
                    </header>

                    {/* Hero strip */}
                    <div className="hero-strip">
                        <div>
                            <span className="terminal-label">
                                {apiUrl("/api/ai/chat/stream")}
                            </span>
                            <h3>
                                Private AI workspace for coding, automation
                                &amp; VPS ops.
                            </h3>
                        </div>
                        <div className="signal-card">
                            <span>Backend status</span>
                            <strong>{error ? "Check API" : "Ready"}</strong>
                        </div>
                    </div>

                    {/* Messages */}
                    <MessageList
                        messages={messages}
                        isLoading={isLoading}
                        error={error}
                        messagesEndRef={messagesEndRef}
                    />

                    {/* Composer */}
                    <div className="composer-card">
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
                        <form className="composer" onSubmit={handleSubmit}>
                            <textarea
                                aria-label="Prompt — press Enter to send, Shift+Enter for new line"
                                placeholder="พิมพ์ข้อความ… (Enter ส่ง / Shift+Enter ขึ้นบรรทัด)"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                            />
                            <button
                                className="send-btn"
                                type="submit"
                                disabled={isLoading || prompt.trim() === ""}
                                aria-label="Send message"
                            >
                                <IconArrowUp />
                            </button>
                        </form>
                    </div>
                </section>

                {/* ── Context Panel ────────────────────────── */}
                <ContextPanel error={error} />
            </main>
        </>
    );
}
