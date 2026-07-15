"use client";

import { type UIMessage, useChat } from "@tanstack/ai-react";
import {
    type FormEvent,
    type KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    availableAiModels,
    createBackendChatFetcher,
    defaultAiModel,
} from "../../lib/backend-chat-fetcher";
import { sessionTitleFromMessages } from "../../lib/chat-message-utils";
import {
    chatSessionsStorageKey,
    type ChatSession,
    mergeChatSessions,
    persistStoredSessions,
    readStoredSessions,
} from "../../lib/chat-sessions";
import { useResponsiveDrawer } from "./use-responsive-drawer";
import { useAutoScroll } from "./use-auto-scroll";

const initialMessages: UIMessage[] = [];

export type ChatWorkspaceState = {
    prompt: string;
    setPrompt: (value: string) => void;
    sortedSessions: ChatSession[];
    activeSession: ChatSession | undefined;
    activeSessionId: string;
    selectedModel: string;
    hasConnected: boolean;
    isLoading: boolean;
    error: Error | undefined | null;
    messages: UIMessage[];
    stopGeneration: () => void;
    mobileDrawerOpen: boolean;
    setMobileDrawerOpen: (open: boolean) => void;
    isMobile: boolean;
    sidebarRef: React.RefObject<HTMLElement | null>;
    closeButtonRef: React.RefObject<HTMLButtonElement | null>;
    menuButtonRef: React.RefObject<HTMLButtonElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    messagesContainerRef: React.RefObject<HTMLDivElement | null>;
    statusLabel: string;
    showEmptyState: boolean;
    handleMessagesScroll: () => void;
    sendPrompt: (nextPrompt: string) => Promise<void>;
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
    handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    handleSelectedModelChange: (nextModel: string) => void;
    startNewChat: () => void;
    openSession: (session: ChatSession) => void;
    deleteSession: (session: ChatSession) => void;
};


function supportedModel(model: string) {
    return availableAiModels.includes(model) ? model : defaultAiModel;
}

function newSessionId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createChatSession(
    selectedModel = defaultAiModel,
    title = "New chat",
): ChatSession {
    const now = Date.now();
    return {
        id: newSessionId(),
        title,
        messages: initialMessages,
        messageModels: {},
        selectedModel,
        createdAt: now,
        updatedAt: now,
    };
}

export function useChatWorkspace(): ChatWorkspaceState {
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
    const [selectedModel, setSelectedModel] = useState(defaultAiModel);
    const [hasConnected, setHasConnected] = useState(false);
    const [chatClientEpoch, setChatClientEpoch] = useState(0);
    const {
        mobileDrawerOpen,
        setMobileDrawerOpen,
        isMobile,
        sidebarRef,
        closeButtonRef,
        menuButtonRef,
    } = useResponsiveDrawer();

    const hasLoadedStoredSessionsRef = useRef(false);
    const lastChatSessionRef = useRef(activeSessionId);
    const selectedModelRef = useRef(selectedModel);
    useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);

    const activeSession = useMemo(
        () => sessions.find((session) => session.id === activeSessionId),
        [activeSessionId, sessions],
    );
    const chatFetcher = useMemo(
        () => createBackendChatFetcher(() => selectedModelRef.current),
        [],
    );
    const {
        error,
        isLoading,
        messages,
        sendMessage,
        stop: stopGeneration,
    } = useChat({
        id: `${activeSessionId}:${chatClientEpoch}`,
        threadId: activeSessionId,
        fetcher: chatFetcher,
        initialMessages: activeSession?.messages ?? initialMessages,
        devtools: { name: "Panyakorn AI Console" },
        onFinish: (message) => {
            setHasConnected(true);
            const responseModel = selectedModelRef.current;
            setSessions((currentSessions) =>
                currentSessions.map((session) =>
                    session.id === activeSessionId
                        ? {
                              ...session,
                              messageModels: {
                                  ...session.messageModels,
                                  [message.id]: responseModel,
                              },
                              selectedModel: responseModel,
                              updatedAt: Date.now(),
                          }
                        : session,
                ),
            );
        },
});

    const { messagesEndRef, messagesContainerRef, handleMessagesScroll, requestAutoScroll } = useAutoScroll(messages, isLoading);
    const sessionsRef = useRef(sessions);
    const messagesRef = useRef(messages);
    useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    const syncCurrentMessages = useCallback(
        (currentSessions: ChatSession[]) =>
            currentSessions.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          title: sessionTitleFromMessages(messages),
                          messages,
                          selectedModel: selectedModelRef.current,
                          updatedAt: Date.now(),
                      }
                    : session,
            ),
        [activeSessionId, messages],
    );

    useEffect(() => {
        const stored = readStoredSessions(window.localStorage, defaultAiModel);
        if (stored) {
            const storedActiveSession =
                stored.sessions.find(
                    (session) => session.id === stored.activeSessionId,
                ) ?? stored.sessions[0];
            setSessions(stored.sessions);
            setActiveSessionId(storedActiveSession.id);
            setSelectedModel(supportedModel(storedActiveSession.selectedModel));
        }
        hasLoadedStoredSessionsRef.current = true;
    }, []);

    useEffect(() => {
        function syncOtherTabs(event: StorageEvent) {
            if (event.key !== chatSessionsStorageKey) return;
            const stored = readStoredSessions(
                window.localStorage,
                defaultAiModel,
            );
            if (!stored) return;
            const incomingActiveSession = stored.sessions.find(
                (session) => session.id === activeSessionId,
            );
            const localActiveSession = sessionsRef.current.find(
                (session) => session.id === activeSessionId,
            );
            const activeSessionChanged =
                incomingActiveSession !== undefined &&
                (localActiveSession === undefined ||
                    (incomingActiveSession.updatedAt >=
                        localActiveSession.updatedAt &&
                        JSON.stringify(incomingActiveSession) !==
                            JSON.stringify(localActiveSession)));

            const deletedIdSet = new Set(stored.deletedSessionIds);
            if (deletedIdSet.has(activeSessionId)) {
                const nextActiveSession =
                    stored.sessions.find(
                        (session) => session.id === stored.activeSessionId,
                    ) ?? stored.sessions[0];
                if (isLoading) stopGeneration();
                setActiveSessionId(nextActiveSession.id);
                setSelectedModel(
                    supportedModel(nextActiveSession.selectedModel),
                );
            } else if (activeSessionChanged) {
                if (isLoading) stopGeneration();
                setSelectedModel(
                    supportedModel(incomingActiveSession.selectedModel),
                );
                setChatClientEpoch((currentEpoch) => currentEpoch + 1);
            }
            setSessions((currentSessions) =>
                mergeChatSessions(
                    stored.sessions,
                    currentSessions.filter(
                        (session) =>
                            !deletedIdSet.has(session.id),
                    ),
                ),
            );
        }
        window.addEventListener("storage", syncOtherTabs);
        return () => window.removeEventListener("storage", syncOtherTabs);
    }, [activeSessionId, isLoading, stopGeneration]);

    useEffect(() => {
        if (!hasLoadedStoredSessionsRef.current) return;
        if (lastChatSessionRef.current !== activeSessionId) {
            lastChatSessionRef.current = activeSessionId;
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSessions((currentSessions) =>
                syncCurrentMessages(currentSessions),
            );
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [activeSessionId, messages, syncCurrentMessages]);

    useEffect(() => {
        if (!hasLoadedStoredSessionsRef.current) return;
        const timeoutId = window.setTimeout(() => {
            void persistStoredSessions(
                window.localStorage,
                activeSessionId,
                sessions,
                defaultAiModel,
            ).catch(() => {
                // Chat stays usable when storage is unavailable or over quota.
            });
        }, 500);
        return () => window.clearTimeout(timeoutId);
    }, [activeSessionId, sessions]);

    useEffect(() => {
        function flushSession() {
            const current = sessionsRef.current.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          title: sessionTitleFromMessages(messagesRef.current),
                          messages: messagesRef.current,
                          selectedModel: selectedModelRef.current,
                          updatedAt: Date.now(),
                      }
                    : session,
            );
            void persistStoredSessions(
                window.localStorage,
                activeSessionId,
                current,
                defaultAiModel,
            ).catch(() => {
                // Ignore best-effort lifecycle persistence failures.
            });
        }
        function flushWhenHidden() {
            if (document.visibilityState === "hidden") flushSession();
        }
        document.addEventListener("visibilitychange", flushWhenHidden);
        window.addEventListener("pagehide", flushSession);
        return () => {
            document.removeEventListener("visibilitychange", flushWhenHidden);
            window.removeEventListener("pagehide", flushSession);
        };
    }, [activeSessionId]);


    const sortedSessions = useMemo(
        () => sessions.toSorted((a, b) => b.updatedAt - a.updatedAt),
        [sessions],
    );

    const statusLabel = isLoading
        ? "Thinking…"
        : error
          ? "API error"
          : hasConnected
            ? "Connected"
            : "Not checked";
    const showEmptyState = useMemo(() => {
        const hasStartedConversation = messages.some(
            (message) => message.role === "user" || message.id !== "welcome",
        );
        return !hasStartedConversation && !isLoading && !error;
    }, [messages, isLoading, error]);

    // handleMessagesScroll now comes from useAutoScroll

    const sendPrompt = useCallback(
        async (nextPrompt: string) => {
            const trimmed = nextPrompt.trim();
            if (!trimmed || isLoading) return;
            requestAutoScroll();
            setPrompt("");
            await sendMessage(trimmed);
        },
        [isLoading, sendMessage, requestAutoScroll],
    );

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void sendPrompt(prompt);
        },
        [prompt, sendPrompt],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendPrompt(prompt);
            }
        },
        [prompt, sendPrompt],
    );

    const handleSelectedModelChange = useCallback(
        (nextModel: string) => {
            setSelectedModel(nextModel);
            setSessions((currentSessions) =>
                currentSessions.map((session) =>
                    session.id === activeSessionId
                        ? {
                              ...session,
                              selectedModel: nextModel,
                              updatedAt: Date.now(),
                          }
                        : session,
                ),
            );
        },
        [activeSessionId],
    );

    const startNewChat = useCallback(() => {
        if (isLoading) return;
        const nextSession = createChatSession(selectedModel);
        setSessions((currentSessions) => [
            nextSession,
            ...syncCurrentMessages(currentSessions),
        ]);
        setActiveSessionId(nextSession.id);
        setPrompt("");
        setMobileDrawerOpen(false);
    }, [isLoading, selectedModel, setMobileDrawerOpen, syncCurrentMessages]);

    const openSession = useCallback(
        (session: ChatSession) => {
            if (isLoading || session.id === activeSessionId) return;
            setSessions((currentSessions) =>
                syncCurrentMessages(currentSessions),
            );
            setActiveSessionId(session.id);
            setSelectedModel(supportedModel(session.selectedModel));
            setPrompt("");
            setMobileDrawerOpen(false);
        },
        [
            activeSessionId,
            isLoading,
            setMobileDrawerOpen,
            syncCurrentMessages,
        ],
    );

    const deleteSession = useCallback(
        (sessionToDelete: ChatSession) => {
            if (isLoading) return;

            const currentSessions = syncCurrentMessages(sessions);
            const remainingSessions = currentSessions.filter(
                (session) => session.id !== sessionToDelete.id,
            );
            const nextSessions = remainingSessions.length
                ? remainingSessions
                : [createChatSession(selectedModel)];

            const deletingActiveSession =
                sessionToDelete.id === activeSessionId;
            const nextActiveSession = deletingActiveSession
                ? nextSessions.toSorted(
                      (a, b) => b.updatedAt - a.updatedAt,
                  )[0]
                : nextSessions.find(
                      (session) => session.id === activeSessionId,
                  ) ?? nextSessions[0];

            setSessions(nextSessions);
            void persistStoredSessions(
                window.localStorage,
                nextActiveSession.id,
                nextSessions,
                defaultAiModel,
                [sessionToDelete.id],
            ).catch(() => {
                // Keep the in-memory deletion when storage is unavailable.
            });

            if (deletingActiveSession) {
                setActiveSessionId(nextActiveSession.id);
                setSelectedModel(
                    supportedModel(nextActiveSession.selectedModel),
                );
                setPrompt("");
                setMobileDrawerOpen(false);
            }
        },
        [
            activeSessionId,
            isLoading,
            selectedModel,
            sessions,
            setMobileDrawerOpen,
            syncCurrentMessages,
        ],
    );

    return {
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
    };
}
