import type { UIMessage } from "@tanstack/ai-client";

export function messageText(message: UIMessage) {
    const texts: string[] = [];
    for (const part of message.parts) {
        if (part.type === "text") texts.push(part.content);
    }
    return texts.join("\n");
}

export function sessionTitleFromMessages(messages: UIMessage[]) {
    const firstUserMessage = messages.find(
        (message) => message.role === "user",
    );
    const text = firstUserMessage ? messageText(firstUserMessage).trim() : "";
    if (!text) return "New chat";
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}
