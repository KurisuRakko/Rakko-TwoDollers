import { useEffect, useRef, useState } from "react";
import { useStartupOverlayStore } from "./controller";
import StartupOverlay from "./index";

const STARTUP_OVERLAY_EXIT_MS = 560;

type RenderedStartupOverlay = {
    avatarSource?: string;
    displayName: string;
    exitFlightTarget?: {
        scale: number;
        x: number;
        y: number;
    } | null;
    isExiting: boolean;
    layoutId?: string;
    status: string;
};

export default function GlobalStartupOverlay() {
    const {
        avatarSource,
        displayName,
        exitFlightTarget,
        layoutId,
        status,
        visible,
    } = useStartupOverlayStore();
    const [renderedOverlay, setRenderedOverlay] =
        useState<RenderedStartupOverlay | null>(null);
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
            exitTimerRef.current = null;
        }

        if (visible) {
            setRenderedOverlay({
                avatarSource,
                displayName,
                exitFlightTarget: null,
                isExiting: false,
                layoutId,
                status,
            });
            return;
        }

        if (exitFlightTarget) {
            setRenderedOverlay((current) => ({
                ...current,
                avatarSource,
                displayName,
                exitFlightTarget,
                isExiting: true,
                layoutId,
                status,
            }));

            exitTimerRef.current = setTimeout(() => {
                setRenderedOverlay(null);
                exitTimerRef.current = null;
            }, STARTUP_OVERLAY_EXIT_MS);
            return;
        }

        setRenderedOverlay(null);
    }, [
        avatarSource,
        displayName,
        exitFlightTarget,
        layoutId,
        status,
        visible,
    ]);

    useEffect(() => {
        return () => {
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
            }
        };
    }, []);

    if (!renderedOverlay) {
        return null;
    }

    return (
        <StartupOverlay
            avatarSource={renderedOverlay.avatarSource}
            displayName={renderedOverlay.displayName}
            exitFlightTarget={renderedOverlay.exitFlightTarget}
            isExiting={renderedOverlay.isExiting}
            layoutId={renderedOverlay.layoutId}
            status={renderedOverlay.status}
        />
    );
}
