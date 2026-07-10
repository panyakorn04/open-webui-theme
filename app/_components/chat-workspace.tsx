"use client";

import { apiUrl } from "../../lib/backend-chat-fetcher";
import { useChatWorkspace, type ChatWorkspaceState } from "../_hooks/use-chat-workspace";
import { ComposerForm, QuickPrompts } from "./composer-form";
import { ContextPanel } from "./context-panel";
import { IconMenu } from "./icons";
import { MessageList } from "./message-list";
import { Sidebar } from "./sidebar";

const ambientBackground = <div className="ambient" aria-hidden="true" />;

export function ChatWorkspace() {
    const workspace: ChatWorkspaceState = useChatWorkspace();
    const {
        prompt,
        setPrompt,
        sortedSessions,
        activeSession,
        activeSessionId,
        selectedModel,
        hasConnected,
        isLoading,
        error,
        messages,
        stopGeneration,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        isMobile,
        sidebarRef,
        closeButtonRef,
        menuButtonRef,
        messagesEndRef,
        messagesContainerRef,
        statusLabel,
        showEmptyState,
        handleMessagesScroll,
        sendPrompt,
        handleSubmit,
        handleKeyDown,
        handleSelectedModelChange,
        startNewChat,
        openSession,
        deleteSession,
    } = workspace;

    const composer = (
        <ComposerForm
            prompt={prompt}
            onPromptChange={setPrompt}
            isLoading={isLoading}
            selectedModel={selectedModel}
            onSelectedModelChange={handleSelectedModelChange}
            onStopGeneration={stopGeneration}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
        />
    );

    return (
        <>
            {ambientBackground}

            <main className="app-shell">
                <button
                    className="drawer-backdrop"
                    type="button"
                    aria-label="Close navigation drawer"
                    tabIndex={mobileDrawerOpen ? 0 : -1}
                    onClick={() => setMobileDrawerOpen(false)}
                />

                <Sidebar
                    sessions={sortedSessions}
                    activeSessionId={activeSessionId}
                    isLoading={isLoading}
                    mobileDrawerOpen={mobileDrawerOpen}
                    onDrawerOpenChange={setMobileDrawerOpen}
                    onStartNewChat={startNewChat}
                    onOpenSession={openSession}
                    onDeleteSession={deleteSession}
                    selectedModel={selectedModel}
                    isMobile={isMobile}
                    sidebarRef={sidebarRef}
                    closeButtonRef={closeButtonRef}
                />

                <section
                    className={`chat-panel${showEmptyState ? " empty" : ""}`}
                    aria-label="AI chat"
                    inert={mobileDrawerOpen}
                >
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
                                {hasConnected
                                    ? "Backend API Connected"
                                    : "Backend API Not Checked"}
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
                                <h2>You can start when you&apos;re ready.</h2>
                                <div className="composer-card empty-composer-card">
                                    {composer}
                                    <QuickPrompts
                                        isLoading={isLoading}
                                        onSendPrompt={sendPrompt}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
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

                            <MessageList
                                messages={messages}
                                isLoading={isLoading}
                                error={error}
                                messagesEndRef={messagesEndRef}
                                messagesContainerRef={messagesContainerRef}
                                onScroll={handleMessagesScroll}
                                selectedModel={selectedModel}
                                messageModels={
                                    activeSession?.messageModels ?? {}
                                }
                            />

                            <div className="composer-card">{composer}</div>
                        </>
                    )}
                </section>

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
