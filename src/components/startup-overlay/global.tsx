import { useEffect, useRef, useState } from "react";
import { type StartupOverlayMode, useStartupOverlayStore } from "./controller";
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
    exitSourceRect?: {
        height: number;
        left: number;
        top: number;
        width: number;
    } | null;
    isExiting: boolean;
    layoutId?: string;
    minVisibleMs?: number;
    mode: StartupOverlayMode;
    status: string;
};

export default function GlobalStartupOverlay() {
    const {
        avatarSource,
        displayName,
        exitFlightTarget,
        exitSourceRect,
        layoutId,
        minVisibleMs,
        mode,
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
                exitSourceRect: null,
                isExiting: false,
                layoutId,
                minVisibleMs,
                mode,
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
                exitSourceRect,
                isExiting: true,
                layoutId,
                minVisibleMs,
                mode,
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
        exitSourceRect,
        layoutId,
        minVisibleMs,
        mode,
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
            exitSourceRect={renderedOverlay.exitSourceRect}
            isExiting={renderedOverlay.isExiting}
            layoutId={renderedOverlay.layoutId}
            mode={renderedOverlay.mode}
            status={renderedOverlay.status}
        />
    );
}
