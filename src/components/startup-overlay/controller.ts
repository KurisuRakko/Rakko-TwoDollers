import { create } from "zustand";

type StartupOverlayOwner = "root" | "home";
export type StartupOverlayMode = "startup" | "manual-sync";

type StartupOverlayPayload = {
    avatarSource?: string;
    displayName: string;
    layoutId?: string;
    minVisibleMs?: number;
    mode?: StartupOverlayMode;
    status: string;
};

type StartupOverlayRect = {
    height: number;
    left: number;
    top: number;
    width: number;
};

type StartupOverlayFlightTarget = {
    scale: number;
    x: number;
    y: number;
};

type StartupOverlayState = StartupOverlayPayload & {
    avatarRect: StartupOverlayRect | null;
    exitFlightTarget: StartupOverlayFlightTarget | null;
    exitSourceRect: StartupOverlayRect | null;
    minVisibleMs?: number;
    mode: StartupOverlayMode;
    owner: StartupOverlayOwner | null;
    visible: boolean;
};

const ROOT_RELEASE_GRACE_MS = 280;

let rootReleaseTimer: ReturnType<typeof setTimeout> | null = null;

const clearRootReleaseTimer = () => {
    if (rootReleaseTimer) {
        clearTimeout(rootReleaseTimer);
        rootReleaseTimer = null;
    }
};

export const useStartupOverlayStore = create<StartupOverlayState>(() => ({
    avatarSource: undefined,
    avatarRect: null,
    displayName: "",
    exitFlightTarget: null,
    exitSourceRect: null,
    layoutId: undefined,
    minVisibleMs: 0,
    mode: "startup",
    owner: null,
    status: "",
    visible: false,
}));

const getAvatarTargetSelector = (layoutId?: string) => {
    if (!layoutId) {
        return null;
    }

    return `[data-startup-avatar-target="${layoutId}"]`;
};

const resolveExitFlightTarget = (
    layoutId: string | undefined,
    sourceRect: StartupOverlayRect | null,
): StartupOverlayFlightTarget | null => {
    if (!sourceRect || typeof window === "undefined") {
        return null;
    }

    const fallbackSize = 44;
    const fallbackMargin = 28;
    const selector = getAvatarTargetSelector(layoutId);
    const targetRect = selector
        ? (document.querySelector(selector)?.getBoundingClientRect() ?? null)
        : null;
    const targetWidth = targetRect?.width ?? fallbackSize;
    const targetHeight = targetRect?.height ?? fallbackSize;
    const targetLeft =
        targetRect?.left ?? window.innerWidth - fallbackMargin - targetWidth;
    const targetTop = targetRect?.top ?? fallbackMargin;
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetLeft + targetWidth / 2;
    const targetCenterY = targetTop + targetHeight / 2;

    return {
        scale: Math.min(
            targetWidth / sourceRect.width,
            targetHeight / sourceRect.height,
        ),
        x: targetCenterX - sourceCenterX,
        y: targetCenterY - sourceCenterY,
    };
};

const showOverlay = (
    owner: StartupOverlayOwner,
    payload: StartupOverlayPayload,
) => {
    clearRootReleaseTimer();

    useStartupOverlayStore.setState((state) => {
        const ownerPriority = owner === "home" ? 2 : owner === "root" ? 1 : 0;
        const currentPriority =
            state.owner === "home" ? 2 : state.owner === "root" ? 1 : 0;

        if (ownerPriority < currentPriority) {
            return state;
        }

        return {
            ...state,
            ...payload,
            avatarRect: state.avatarRect,
            exitFlightTarget: null,
            exitSourceRect: null,
            owner,
            visible: true,
        };
    });
};

export const showRootStartupOverlay = (payload: StartupOverlayPayload) => {
    showOverlay("root", payload);
};

export const releaseRootStartupOverlay = () => {
    clearRootReleaseTimer();

    rootReleaseTimer = setTimeout(() => {
        useStartupOverlayStore.setState((state) => {
            if (state.owner !== "root") {
                return state;
            }

            return {
                ...state,
                avatarRect: null,
                exitFlightTarget: null,
                exitSourceRect: null,
                minVisibleMs: 0,
                mode: "startup",
                owner: null,
                visible: false,
            };
        });
        rootReleaseTimer = null;
    }, ROOT_RELEASE_GRACE_MS);
};

export const showHomeStartupOverlay = (payload: StartupOverlayPayload) => {
    showOverlay("home", payload);
};

export const hideHomeStartupOverlay = () => {
    clearRootReleaseTimer();

    useStartupOverlayStore.setState((state) => {
        if (state.owner !== "home") {
            return state;
        }

        return {
            ...state,
            avatarRect: null,
            exitFlightTarget: resolveExitFlightTarget(
                state.layoutId,
                state.avatarRect,
            ),
            exitSourceRect: state.avatarRect,
            minVisibleMs: state.minVisibleMs,
            mode: state.mode,
            owner: null,
            visible: false,
        };
    });
};

export const setStartupOverlayAvatarRect = (
    avatarRect: StartupOverlayRect | null,
) => {
    useStartupOverlayStore.setState((state) => {
        if (!state.visible) {
            return state;
        }

        return {
            ...state,
            avatarRect,
        };
    });
};
