"use client";

import { FormEvent, useMemo, useState } from "react";

const conversations = [
  "Deploy Frontend to VPS",
  "YouTube Highlight Workflow",
  "AI Backend Chat",
  "Portfolio API Integration",
];

const skills = ["portfolio-2026", "vps-ai-services", "youtube-highlight-automation"];

const quickPrompts = [
  "ตรวจ docker compose ของ Open WebUI",
  "สรุป deployment checklist",
  "ช่วยเขียน n8n prompt สำหรับ highlight",
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://api.panyakorn.com";
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

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    meta: "Panyakorn AI",
    content:
      "สวัสดีครับ ตอนนี้ AI Console เชื่อมกับ backend API และ Ollama local model แล้ว ลองพิมพ์คำถามได้เลยครับ",
  },
];

function buildMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (isSending) return "Thinking...";
    if (error) return "API needs attention";
    return "API connected";
  }, [error, isSending]);

  async function sendPrompt(nextPrompt: string) {
    const trimmedPrompt = nextPrompt.trim();
    if (!trimmedPrompt || isSending) return;

    const userMessage: ChatMessage = {
      id: buildMessageId(),
      role: "user",
      meta: "You",
      content: trimmedPrompt,
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const history = [...messages, userMessage]
        .slice(-10)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const result = (await response.json()) as ApiChatResponse;
      if (!response.ok || !result.ok || !result.data?.message?.content) {
        throw new Error(result.error?.message ?? `AI request failed (${response.status})`);
      }

      const assistantMessage: ChatMessage = {
        id: buildMessageId(),
        role: "assistant",
        meta: `${result.data.model} · ${result.data.usage?.eval_count ?? 0} tokens`,
        content: result.data.message.content,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Unable to send prompt.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: buildMessageId(),
          role: "assistant",
          meta: "API error",
          content: `ขออภัยครับ เรียก backend AI ไม่สำเร็จ: ${message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(prompt);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-card">
          <div className="brand-mark">PK</div>
          <div>
            <p className="eyebrow">PANYAKORN</p>
            <h1>AI Console</h1>
          </div>
        </div>

        <button className="new-chat" type="button" onClick={() => { setMessages(initialMessages); setError(null); }}>
          + New chat
        </button>

        <section className="nav-section">
          <p className="section-label">Recent</p>
          <div className="conversation-list">
            {conversations.map((item, index) => (
              <button className={index === 2 ? "conversation active" : "conversation"} key={item} type="button">
                <span className="dot" />
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="nav-section bottom">
          <p className="section-label">Model</p>
          <div className="model-card">
            <span className="status-dot" />
            <div>
              <strong>panyakorn-local</strong>
              <span>qwen2.5:3b · Ollama internal</span>
            </div>
          </div>
        </section>
      </aside>

      <section className="chat-panel" aria-label="AI chat">
        <header className="topbar">
          <div>
            <p className="eyebrow">Backend API Connected</p>
            <h2>Workspace ที่คุยกับ Ollama บน VPS ได้จริง</h2>
          </div>
          <div className="topbar-actions">
            <span className="pill">{statusLabel}</span>
            <span className="pill accent">{aiModel}</span>
          </div>
        </header>

        <div className="hero-strip">
          <div>
            <span className="terminal-label">{apiBaseUrl}/api/ai/chat</span>
            <h3>Private AI workspace for coding, automation, and VPS operations.</h3>
          </div>
          <div className="signal-card">
            <span>Backend status</span>
            <strong>{error ? "Check API" : "Ready"}</strong>
          </div>
        </div>

        <div className="messages" aria-live="polite">
          {messages.map((message) => (
            <article className={message.role === "user" ? "message user" : "message assistant"} key={message.id}>
              {message.role === "assistant" ? <span className="avatar">AI</span> : null}
              <div className="bubble">
                <p className="message-meta">{message.meta}</p>
                <p>{message.content}</p>
              </div>
              {message.role === "user" ? <span className="avatar user-avatar">PB</span> : null}
            </article>
          ))}
          {isSending ? (
            <article className="message assistant">
              <span className="avatar">AI</span>
              <div className="bubble">
                <p className="message-meta">Thinking</p>
                <p>กำลังเรียก backend และ local Ollama model...</p>
              </div>
            </article>
          ) : null}
        </div>

        <div className="composer-card">
          <div className="quick-prompts">
            {quickPrompts.map((quickPrompt) => (
              <button key={quickPrompt} type="button" onClick={() => void sendPrompt(quickPrompt)} disabled={isSending}>
                {quickPrompt}
              </button>
            ))}
          </div>
          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              aria-label="Prompt"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="พิมพ์ข้อความเพื่อคุยกับ panyakorn-local:latest"
              value={prompt}
            />
            <button type="submit" disabled={isSending || prompt.trim() === ""}>
              {isSending ? "Sending" : "Send"}
            </button>
          </form>
        </div>
      </section>

      <aside className="context-panel" aria-label="Context and skills">
        <section className="glass-card glow-card">
          <p className="eyebrow">Live wiring</p>
          <h3>Frontend → Backend → Ollama</h3>
          <div className="token-grid">
            <span style={{ background: "oklch(0.16 0.015 165)" }} />
            <span style={{ background: "oklch(0.21 0.022 165)" }} />
            <span style={{ background: "oklch(0.86 0.18 155)" }} />
            <span style={{ background: "oklch(0.78 0.045 158)" }} />
          </div>
        </section>

        <section className="glass-card">
          <p className="section-label">Attached skills</p>
          <div className="skill-list">
            {skills.map((skill) => (
              <div className="skill-chip" key={skill}>
                <span>#</span>
                {skill}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card terminal-card">
          <p className="section-label">Runtime</p>
          <code>NEXT_PUBLIC_API_URL={apiBaseUrl}</code>
          <code>BACKEND_MODEL={aiModel}</code>
          <code>OLLAMA_URL=internal://ollama:11434</code>
        </section>
      </aside>
    </main>
  );
}
