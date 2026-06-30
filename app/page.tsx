const conversations = [
  "Deploy Frontend to VPS",
  "YouTube Highlight Workflow",
  "Open WebUI Theme Draft",
  "Portfolio API Integration",
];

const skills = ["portfolio-2026", "vps-ai-services", "youtube-highlight-automation"];

const quickPrompts = [
  "ตรวจ docker compose ของ Open WebUI",
  "สรุป deployment checklist",
  "ช่วยเขียน n8n prompt สำหรับ highlight",
];

export default function Home() {
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

        <button className="new-chat" type="button">+ New chat</button>

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
              <strong>panyakorn-glm</strong>
              <span>glm-5.2:cloud · draft</span>
            </div>
          </div>
        </section>
      </aside>

      <section className="chat-panel" aria-label="Chat preview">
        <header className="topbar">
          <div>
            <p className="eyebrow">Open WebUI Theme Shell</p>
            <h2>Workspace ที่หน้าตาเข้ากับ panyakorn.com</h2>
          </div>
          <div className="topbar-actions">
            <span className="pill">No API connected</span>
            <span className="pill accent">Theme Preview</span>
          </div>
        </header>

        <div className="hero-strip">
          <div>
            <span className="terminal-label">~/open-webui-theme</span>
            <h3>Private AI workspace for coding, automation, and VPS operations.</h3>
          </div>
          <div className="signal-card">
            <span>UI status</span>
            <strong>Ready for review</strong>
          </div>
        </div>

        <div className="messages">
          <article className="message assistant">
            <span className="avatar">AI</span>
            <div className="bubble">
              <p className="message-meta">Panyakorn AI</p>
              <p>สวัสดีครับ นี่คือ shell UI สำหรับ Open WebUI ที่ยังไม่เชื่อม API แต่เตรียม layout สำหรับ chat, skills, และ model context ไว้แล้ว</p>
            </div>
          </article>

          <article className="message user">
            <div className="bubble">
              <p className="message-meta">You</p>
              <p>ช่วยดู deployment checklist สำหรับ Ollama + Open WebUI บน VPS ให้หน่อย</p>
            </div>
            <span className="avatar user-avatar">PB</span>
          </article>

          <article className="message assistant">
            <span className="avatar">AI</span>
            <div className="bubble checklist">
              <p className="message-meta">Draft response</p>
              <ul>
                <li>Ollama อยู่ internal network เท่านั้น</li>
                <li>Open WebUI เปิดผ่าน HTTPS และ login</li>
                <li>Modelfile deploy จาก repo-managed custom skills</li>
              </ul>
            </div>
          </article>
        </div>

        <div className="composer-card">
          <div className="quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button">{prompt}</button>
            ))}
          </div>
          <div className="composer">
            <textarea aria-label="Prompt" defaultValue="ยังไม่เชื่อม API — ช่องนี้เป็น mock composer สำหรับ theme preview" />
            <button type="button">Send</button>
          </div>
        </div>
      </section>

      <aside className="context-panel" aria-label="Context and skills">
        <section className="glass-card glow-card">
          <p className="eyebrow">Theme tokens</p>
          <h3>panyakorn.com inspired</h3>
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
          <p className="section-label">Future wiring</p>
          <code>OLLAMA_BASE_URL=http://ollama:11434</code>
          <code>DEFAULT_MODEL=panyakorn-glm:latest</code>
          <code>WEBUI_URL=https://ai.panyakorn.com</code>
        </section>
      </aside>
    </main>
  );
}
