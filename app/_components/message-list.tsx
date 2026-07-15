import type { UIMessage } from "@tanstack/ai-react";
import { memo, type RefObject } from "react";
import { messageText } from "../../lib/chat-message-utils";

function messageMeta(
    message: UIMessage,
    selectedModel: string,
    messageModels: Record<string, string>,
) {
    if (message.id === "welcome") return "Panyakorn AI";
    return message.role === "assistant"
        ? (messageModels[message.id] ?? selectedModel)
        : "You";
}

type MessageItemProps = {
    message: UIMessage;
    selectedModel: string;
    messageModels: Record<string, string>;
};

const MessageItem = memo(function MessageItem({
    message,
    selectedModel,
    messageModels,
}: MessageItemProps) {
    const content = messageText(message);
    if (!content) return null;

    return (
        <article
            className={
                message.role === "user"
                    ? "message user"
                    : "message assistant"
            }
        >
            {message.role === "assistant" && (
                <span className="avatar ai-avatar" aria-hidden="true">
                    AI
                </span>
            )}
            <div className="bubble">
                <p className="message-meta">
                    {messageMeta(message, selectedModel, messageModels)}
                </p>
                <p>{content}</p>
            </div>
            {message.role === "user" && (
                <span className="avatar user-avatar" aria-hidden="true">
                    PB
                </span>
            )}
        </article>
    );
});

type MessageListProps = {
    messages: UIMessage[];
    isLoading: boolean;
    error: Error | undefined | null;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    selectedModel: string;
    messageModels: Record<string, string>;
};

export const MessageList = memo(function MessageList({
    messages,
    isLoading,
    error,
    messagesEndRef,
    messagesContainerRef,
    onScroll,
    selectedModel,
    messageModels,
}: MessageListProps) {
    return (
        <div
            className="messages"
            ref={messagesContainerRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
        >
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    selectedModel={selectedModel}
                    messageModels={messageModels}
                />
            ))}

            {isLoading && (
                <article className="message assistant" aria-label="AI is thinking">
                    <span className="avatar ai-avatar" aria-hidden="true">
                        AI
                    </span>
                    <div className="bubble">
                        <p className="message-meta">Thinking</p>
                        <div className="typing-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>
                </article>
            )}

            {error && (
                <article className="message assistant">
                    <span className="avatar ai-avatar" aria-hidden="true">
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
    );
});
