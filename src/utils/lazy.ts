import { lazy } from "react";

type PreloadMode = "immediate" | "idle" | false;

const schedulePreload = (
    task: () => void,
    mode: Exclude<PreloadMode, false>,
) => {
    if (typeof window === "undefined") {
        task();
        return;
    }

    if (mode === "immediate") {
        Promise.resolve().then(task);
        return;
    }

    const idleWindow = window as Window & {
        requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
        ) => number;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
        idleWindow.requestIdleCallback(() => task(), { timeout: 1500 });
        return;
    }

    window.setTimeout(task, 320);
};

export const lazyWithReload = (
    preload: Parameters<typeof lazy>[0],
    guard?: () => Promise<void>,
    options?: {
        preload?: PreloadMode;
    },
) => {
    let preloaded: ReturnType<typeof preload> | undefined;

    const load = () => {
        if (!preloaded) {
            preloaded = preload();
        }
        return preloaded;
    };

    const safeLoad = async () => {
        await guard?.();
        return load();
    };

    const preloadMode = options?.preload ?? "idle";
    if (preloadMode) {
        schedulePreload(() => {
            void load();
        }, preloadMode);
    }

    return lazy(safeLoad);
};
