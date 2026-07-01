"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
const aiModel = "panyakorn-local:latest";

type ChatRole = "assistant" | "user";

type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    meta: string;
};

type ApiChatResponse = {
    ok: boolean;
    data?: {
        model: string;
        message?: { role: "assistant" | "user" | "system"; content: string };
        done: boolean;
        usage?: { prompt_eval_count?: number; eval_count?: number };
    };
    error?: { message?: string };
};

function apiUrl(path: string) {
    if (!apiBaseUrl) return path;
    return `${apiBaseUrl.replace(/\/$/, "")}${path}`;
}

function buildId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const initialMessages: ChatMessage[] = [
    {
        id: "welcome",
        role: "assistant",
        meta: "Panyakorn AI",
        content:
            "สวัสดีครับ ตอนนี้ AI Console เชื่อมกับ backend API และ Ollama local model แล้ว ลองพิมพ์คำถามได้เลยครับ",
    },
];

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
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [prompt, setPrompt] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    /* Auto-scroll to bottom after every render that changes the message list */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    const statusLabel = useMemo(() => {
        if (isSending) return "Thinking…";
        if (error) return "API error";
        return "Connected";
    }, [error, isSending]);

    async function sendPrompt(nextPrompt: string) {
        const trimmed = nextPrompt.trim();
        if (!trimmed || isSending) return;

        const userMsg: ChatMessage = {
            id: buildId(),
            role: "user",
            meta: "You",
            content: trimmed,
        };

        setMessages((prev) => [...prev, userMsg]);
        setPrompt("");
        setError(null);
        setIsSending(true);

        try {
            const history = [...messages, userMsg]
                .slice(-10)
                .map(({ role, content }) => ({ role, content }));

            const res = await fetch(apiUrl("/api/ai/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history }),
            });

            const result = (await res.json()) as ApiChatResponse;
            if (!res.ok || !result.ok || !result.data?.message?.content) {
                throw new Error(
                    result.error?.message ??
                        `AI request failed (${res.status})`,
                );
            }

            const assistantMsg: ChatMessage = {
                id: buildId(),
                role: "assistant",
                meta: `${result.data.model} · ${result.data.usage?.eval_count ?? 0} tokens`,
                content: result.data.message.content,
            };

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : "Unable to send prompt.";
            setError(msg);
            setMessages((prev) => [
                ...prev,
                {
                    id: buildId(),
                    role: "assistant",
                    meta: "API error",
                    content: `ขออภัยครับ เรียก backend AI ไม่สำเร็จ: ${msg}`,
                },
            ]);
        } finally {
            setIsSending(false);
        }
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        void sendPrompt(prompt);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendPrompt(prompt);
        }
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
                        onClick={() => {
                            setMessages(initialMessages);
                            setError(null);
                        }}
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
                                <span>qwen2.5:3b · Ollama internal</span>
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
                                className={`pill${isSending ? " thinking" : ""}`}
                            >
                                <span className="pill-dot" aria-hidden="true" />
                                {statusLabel}
                            </span>
                            <span className="pill accent">{aiModel}</span>
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
                        {messages.map((msg) => (
                            <article
                                key={msg.id}
                                className={
                                    msg.role === "user"
                                        ? "message user"
                                        : "message assistant"
                                }
                            >
                                {msg.role === "assistant" && (
                                    <span
                                        className="avatar ai-avatar"
                                        aria-hidden="true"
                                    >
                                        AI
                                    </span>
                                )}
                                <div className="bubble">
                                    <p className="message-meta">{msg.meta}</p>
                                    <p>{msg.content}</p>
                                </div>
                                {msg.role === "user" && (
                                    <span
                                        className="avatar user-avatar"
                                        aria-hidden="true"
                                    >
                                        PB
                                    </span>
                                )}
                            </article>
                        ))}

                        {/* Typing indicator */}
                        {isSending && (
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
                                    disabled={isSending}
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
                                disabled={isSending}
                            />
                            <button
                                className="send-btn"
                                type="submit"
                                disabled={isSending || prompt.trim() === ""}
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
                        <h3>Frontend → Backend → Ollama</h3>
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
                        <code>BACKEND_MODEL={aiModel}</code>
                        <code>OLLAMA_URL=internal://ollama:11434</code>
                    </section>
                </aside>
            </main>
        </>
    );
}
