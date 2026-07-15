import { memo, type RefObject } from "react";

import { VERSION } from "../../lib/version";
import type { ChatSession } from "../../lib/chat-sessions";
import { IconPlus, IconTrash, IconX } from "./icons";

type SidebarSessionItemProps = {
    session: ChatSession;
    active: boolean;
    isLoading: boolean;
    onOpenSession: (session: ChatSession) => void;
    onDeleteSession: (session: ChatSession) => void;
};

const SidebarSessionItem = memo(function SidebarSessionItem({
    session,
    active,
    isLoading,
    onOpenSession,
    onDeleteSession,
}: SidebarSessionItemProps) {
    return (
        <div
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
                onClick={() => onOpenSession(session)}
            >
                <span
                    className={active ? "dot" : "dot dot-dim"}
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
                onClick={() => onDeleteSession(session)}
            >
                <IconTrash />
            </button>
        </div>
    );
});

type SidebarProps = {
    sessions: ChatSession[];
    activeSessionId: string;
    isLoading: boolean;
    mobileDrawerOpen: boolean;
    onDrawerOpenChange: (open: boolean) => void;
    onStartNewChat: () => void;
    onOpenSession: (session: ChatSession) => void;
    onDeleteSession: (session: ChatSession) => void;
    selectedModel: string;
    isMobile: boolean;
    sidebarRef: RefObject<HTMLElement | null>;
    closeButtonRef: RefObject<HTMLButtonElement | null>;
};

export const Sidebar = memo(function Sidebar({
    sessions,
    activeSessionId,
    isLoading,
    mobileDrawerOpen,
    onDrawerOpenChange,
    onStartNewChat,
    onOpenSession,
    onDeleteSession,
    selectedModel,
    isMobile,
    sidebarRef,
    closeButtonRef,
}: SidebarProps) {
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
                    onClick={() => onDrawerOpenChange(false)}
                >
                    <IconX />
                </button>
            </div>

            <button
                className="new-chat"
                type="button"
                onClick={onStartNewChat}
                disabled={isLoading}
            >
                <IconPlus />
                New chat
            </button>

            <nav className="nav-section" aria-label="Recent conversations">
                <p className="section-label">Recent</p>
                <div className="conversation-list">
                    {sessions.map((session) => (
                        <SidebarSessionItem
                            key={session.id}
                            session={session}
                            active={session.id === activeSessionId}
                            isLoading={isLoading}
                            onOpenSession={onOpenSession}
                            onDeleteSession={onDeleteSession}
                        />
                    ))}
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
                <div className="version-line" title="Current version">
                    v{VERSION}
                </div>
            </div>
        </aside>
    );
});
