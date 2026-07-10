import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { UIMessage } from "@tanstack/ai-react";

export type AutoScrollController = {
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messagesContainerRef: RefObject<HTMLDivElement | null>;
    handleMessagesScroll: () => void;
    requestAutoScroll: () => void;
};

/**
 * Small focused hook for chat message auto-scroll behavior.
 * Keeps scroll intent, reduced-motion respect, and scroll handling isolated.
 */
export function useAutoScroll(messages: UIMessage[], isLoading: boolean): AutoScrollController {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    // Effect: auto-scroll to bottom when messages change (if user is near bottom)
    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        messagesEndRef.current?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
        });
    }, [messages, isLoading]);

    const handleMessagesScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const distanceFromBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight;

        shouldAutoScrollRef.current = distanceFromBottom < 160;
    }, []);

    const requestAutoScroll = useCallback(() => {
        shouldAutoScrollRef.current = true;
    }, []);

    return {
        messagesEndRef,
        messagesContainerRef,
        handleMessagesScroll,
        requestAutoScroll,
    };
}
