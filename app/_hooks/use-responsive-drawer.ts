import { useEffect, useRef, useState } from "react";

export function useResponsiveDrawer() {
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function syncVisualViewportHeight() {
            const height = window.visualViewport?.height ?? window.innerHeight;
            document.documentElement.style.setProperty(
                "--visual-viewport-height",
                `${height}px`,
            );
        }

        syncVisualViewportHeight();
        window.visualViewport?.addEventListener(
            "resize",
            syncVisualViewportHeight,
        );
        window.visualViewport?.addEventListener(
            "scroll",
            syncVisualViewportHeight,
            { passive: true },
        );
        window.addEventListener("resize", syncVisualViewportHeight);

        return () => {
            window.visualViewport?.removeEventListener(
                "resize",
                syncVisualViewportHeight,
            );
            window.visualViewport?.removeEventListener(
                "scroll",
                syncVisualViewportHeight,
            );
            window.removeEventListener("resize", syncVisualViewportHeight);
        };
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 900px)");
        const syncMobileState = () => {
            setIsMobile(mediaQuery.matches);
            if (!mediaQuery.matches) setMobileDrawerOpen(false);
        };
        syncMobileState();
        mediaQuery.addEventListener("change", syncMobileState);
        return () => mediaQuery.removeEventListener("change", syncMobileState);
    }, []);

    useEffect(() => {
        document.body.classList.toggle("drawer-open", mobileDrawerOpen);
        if (!mobileDrawerOpen) {
            return () => document.body.classList.remove("drawer-open");
        }

        const previousFocus = document.activeElement as HTMLElement | null;
        const sidebar = sidebarRef.current;
        closeButtonRef.current?.focus();

        function handleDrawerKeyDown(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") {
                setMobileDrawerOpen(false);
                return;
            }
            if (event.key !== "Tab" || !sidebar) return;

            const focusable = [
                ...sidebar.querySelectorAll<HTMLElement>(
                    'button:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
                ),
            ].filter((element) => !element.hasAttribute("inert"));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable.at(-1)!;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        window.addEventListener("keydown", handleDrawerKeyDown);
        return () => {
            window.removeEventListener("keydown", handleDrawerKeyDown);
            document.body.classList.remove("drawer-open");
            (previousFocus ?? menuButtonRef.current)?.focus();
        };
    }, [mobileDrawerOpen]);

    return {
        mobileDrawerOpen,
        setMobileDrawerOpen,
        isMobile,
        sidebarRef,
        closeButtonRef,
        menuButtonRef,
    };
}
