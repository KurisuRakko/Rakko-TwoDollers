export const DEFAULT_WALLPAPER_PATH = `${
    import.meta.env.BASE_URL
}wallpaper-default.jpeg`;

export const preloadImage = (src: string) => {
    if (typeof window === "undefined" || !src) {
        return;
    }

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
};

export const preloadImageWhenIdle = (src: string) => {
    if (typeof window === "undefined" || !src) {
        return;
    }

    const run = () => preloadImage(src);
    const idleWindow = window as Window & {
        cancelIdleCallback?: (handle: number) => void;
        requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
        ) => number;
    };
    const requestIdle = idleWindow.requestIdleCallback;

    if (typeof requestIdle === "function") {
        const id = requestIdle(run, { timeout: 1200 });
        return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(run, 240);
    return () => window.clearTimeout(timer);
};
