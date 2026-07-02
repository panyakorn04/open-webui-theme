export default function Loading() {
    return (
        <main className="app-shell">
            <aside className="sidebar" aria-label="Workspace navigation">
                <div className="brand-card">
                    <div className="brand-mark" aria-hidden="true">
                        PK
                    </div>
                    <div className="brand-info">
                        <p className="eyebrow">PANYAKORN</p>
                        <h1>AI Console</h1>
                    </div>
                </div>
                <div className="nav-section">
                    <p className="section-label">Recent</p>
                    <div className="conversation-list">
                        {Array.from({ length: 3 }, (_, i) => (
                            <div key={i} className="conversation skeleton">
                                <span className="dot dot-dim" aria-hidden="true" />
                                <span className="skeleton-text" />
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
            <section className="chat-panel" aria-label="AI chat">
                <header className="topbar">
                    <div className="topbar-title">
                        <p className="eyebrow">Backend API Connected</p>
                        <h2>New chat</h2>
                    </div>
                </header>
                <div className="messages" role="log" aria-label="Chat messages">
                    <article className="message assistant">
                        <span className="avatar ai-avatar" aria-hidden="true">
                            AI
                        </span>
                        <div className="bubble">
                            <p className="message-meta">Panyakorn AI</p>
                            <p>กำลังโหลด…</p>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    );
}
