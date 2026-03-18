import { useEffect, useMemo } from "react";

const isIPhoneWebKit = () => {
    if (typeof navigator === "undefined") {
        return false;
    }

    const ua = navigator.userAgent;
    return /iPhone/.test(ua) && /AppleWebKit/.test(ua);
};

export function useDialogViewportVar({
    enabled = true,
    varName = "--dialog-vh",
}: {
    enabled?: boolean;
    varName?: string;
} = {}) {
    const shouldSync = useMemo(() => {
        return (
            enabled &&
            typeof window !== "undefined" &&
            Boolean(window.visualViewport) &&
            isIPhoneWebKit()
        );
    }, [enabled]);

    useEffect(() => {
        if (!shouldSync) {
            return;
        }

        const viewport = window.visualViewport;
        if (!viewport) {
            return;
        }

        const root = document.documentElement;
        let frameId = 0;

        const update = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(() => {
                const nextHeight = Math.max(1, Math.round(viewport.height));
                root.style.setProperty(varName, `${nextHeight}px`);
            });
        };

        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", update);

        return () => {
            window.cancelAnimationFrame(frameId);
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
            window.removeEventListener("orientationchange", update);
            root.style.removeProperty(varName);
        };
    }, [shouldSync, varName]);

    return shouldSync;
}
