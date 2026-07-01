"use client";

import {
    type FormEvent,
    type KeyboardEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useChat, type UIMessage } from "@tanstack/ai-react";
import { aiModel, apiUrl, backendChatFetcher } from "../lib/backend-chat-fetcher";

const conversations = [
    { label: "Deploy Frontend to VPS", active: false },
    { label: "YouTube Highlight Workflow", active: false },
    { label: "AI Backend Chat", active: true },
    { label: "Portfolio API Integration", active: false },
];

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

function messageText(message: UIMessage) {
    return message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.content)
        .join("\n");
}

function messageMeta(message: UIMessage) {
    if (message.id === "welcome") return "Panyakorn AI";
    return message.role === "assistant" ? aiModel : "You";
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

/* ── Component ─────────────────────────────────────── */
export default function Home() {
    const [prompt, setPrompt] = useState("");
    const { clear, error, isLoading, messages, sendMessage, setMessages } =
        useChat({
            fetcher: backendChatFetcher,
            initialMessages,
            devtools: { name: "Panyakorn AI Console" },
        });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    /* Auto-scroll to bottom after every render that changes the message list */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    const statusLabel = useMemo(() => {
        if (isLoading) return "Thinking…";
        if (error) return "API error";
        return "Connected";
    }, [error, isLoading]);

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

    function resetChat() {
        clear();
        setMessages(initialMessages);
        setPrompt("");
    }

    return (
        <>
            {/* Ambient background blobs */}
            <div className="ambient" aria-hidden="true" />

            <main className="app-shell">
                {/* ── Sidebar ─────────────────────────────── */}
                <aside className="sidebar" aria-label="Workspace navigation">
                    {/* Brand */}
                    <div className="brand-card">
                        <div className="brand-mark" aria-hidden="true">
                            PK
                        </div>
                        <div className="brand-info">
                            <p className="eyebrow">PANYAKORN</p>
                            <h1>AI Console</h1>
                        </div>
                    </div>

                    {/* New Chat */}
                    <button
                        className="new-chat"
                        type="button"
                        onClick={resetChat}
                    >
                        <IconPlus />
                        New chat
                    </button>

                    {/* Recent conversations */}
                    <nav
                        className="nav-section"
                        aria-label="Recent conversations"
                    >
                        <p className="section-label">Recent</p>
                        <div className="conversation-list">
                            {conversations.map(({ label, active }) => (
                                <button
                                    key={label}
                                    className={
                                        active
                                            ? "conversation active"
                                            : "conversation"
                                    }
                                    type="button"
                                    aria-current={active ? "page" : undefined}
                                >
                                    <span
                                        className={
                                            active ? "dot" : "dot dot-dim"
                                        }
                                        aria-hidden="true"
                                    />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    {/* Model */}
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

                {/* ── Chat Panel ──────────────────────────── */}
                <section className="chat-panel" aria-label="AI chat">
                    {/* Topbar */}
                    <header className="topbar">
                        <div className="topbar-title">
                            <p className="eyebrow">Backend API Connected</p>
                            <h2>Workspace ที่คุยกับ Ollama บน VPS ได้จริง</h2>
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
                                {apiUrl("/api/ai/chat")}
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

                        {/* Typing indicator */}
                        {isLoading && (
                            <article
                                className="message assistant"
                                aria-label="AI is thinking"
                            >
                                <span
                                    className="avatar ai-avatar"
                                    aria-hidden="true"
                                >
                                    AI
                                </span>
                                <div className="bubble">
                                    <p className="message-meta">Thinking</p>
                                    <div
                                        className="typing-dots"
                                        aria-hidden="true"
                                    >
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                </div>
                            </article>
                        )}

                        {error && (
                            <article className="message assistant">
                                <span
                                    className="avatar ai-avatar"
                                    aria-hidden="true"
                                >
                                    AI
                                </span>
                                <div className="bubble">
                                    <p className="message-meta">API error</p>
                                    <p>
                                        ขออภัยครับ เรียก backend AI ไม่สำเร็จ: {error.message}
                                    </p>
                                </div>
                            </article>
                        )}

                        <div ref={messagesEndRef} aria-hidden="true" />
                    </div>

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
                <aside
                    className="context-panel"
                    aria-label="Context and skills"
                >
                    {/* Status card */}
                    <section className="glass-card glow-card">
                        <p className="eyebrow">Live wiring</p>
                        <h3>Frontend → TanStack AI → Backend → Ollama</h3>
                        <div className="token-grid" aria-hidden="true">
                            <span
                                style={{ background: "rgba(34,197,94,0.08)" }}
                            />
                            <span
                                style={{ background: "rgba(34,197,94,0.16)" }}
                            />
                            <span
                                style={{ background: "rgba(34,197,94,0.55)" }}
                            />
                            <span
                                style={{ background: "rgba(34,197,94,0.30)" }}
                            />
                        </div>
                        <div className="connection-row">
                            <span className="conn-label">API status</span>
                            <span className="conn-status">
                                {error ? "● Error" : "● Online"}
                            </span>
                        </div>
                    </section>

                    {/* Skills */}
                    <section className="glass-card">
                        <p className="section-label">Attached skills</p>
                        <div className="skill-list">
                            {skills.map((s) => (
                                <div className="skill-chip" key={s}>
                                    <span
                                        className="skill-chip-hash"
                                        aria-hidden="true"
                                    >
                                        #
                                    </span>
                                    {s}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Runtime */}
                    <section className="glass-card terminal-card">
                        <p className="section-label">Runtime</p>
                        <code>
                            NEXT_PUBLIC_API_URL={apiBaseUrl || "same-origin"}
                        </code>
                        <code>AI_CLIENT=TanStack AI fetcher</code>
                        <code>BACKEND_MODEL={aiModel}</code>
                        <code>OLLAMA_URL=internal://ollama:11434</code>
                    </section>
                </aside>
            </main>
        </>
    );
}
