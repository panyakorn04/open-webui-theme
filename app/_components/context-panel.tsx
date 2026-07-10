import { memo } from "react";

import { VERSION } from "../../lib/version";

const skills = [
    "portfolio-2026",
    "vps-ai-services",
    "youtube-highlight-automation",
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

type ContextPanelProps = {
    error: Error | undefined | null;
    selectedModel: string;
    inert: boolean;
    hasConnected: boolean;
};

export const ContextPanel = memo(function ContextPanel({
    error,
    selectedModel,
    inert,
    hasConnected,
}: ContextPanelProps) {
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
                    {skills.map((skill) => (
                        <div className="skill-chip" key={skill}>
                            <span className="skill-chip-hash" aria-hidden="true">
                                #
                            </span>
                            {skill}
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
                    <code>VERSIGN={VERSION}</code>
            </section>
        </aside>
    );
});
