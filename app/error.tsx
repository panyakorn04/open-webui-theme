"use client";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="app-shell">
            <section className="chat-panel" aria-label="Error">
                <div className="messages" style={{ placeContent: "center" }}>
                    <article className="message assistant">
                        <div className="bubble">
                            <p className="message-meta">Application Error</p>
                            <p>เกิดข้อผิดพลาด: {error.message}</p>
                            <button
                                className="send-btn"
                                type="button"
                                onClick={() => reset()}
                                style={{ marginTop: 16, width: "auto", padding: "8px 20px" }}
                            >
                                ลองอีกครั้ง
                            </button>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    );
}
