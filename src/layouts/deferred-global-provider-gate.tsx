import { Suspense, useEffect, useState } from "react";
import { lazyWithReload } from "@/utils/lazy";

const DeferredGlobalProviders = lazyWithReload(
    () => import("./deferred-global-providers"),
    undefined,
    { preload: false },
);

let shouldMountDeferredGlobalProviders = false;
let deferredGlobalProvidersMounted = false;
const mountListeners = new Set<() => void>();
const mountedResolvers = new Set<() => void>();

const requestDeferredGlobalProviders = () => {
    if (shouldMountDeferredGlobalProviders) {
        return;
    }

    shouldMountDeferredGlobalProviders = true;
    for (const listener of mountListeners) {
        listener();
    }
};

export const markDeferredGlobalProvidersMounted = () => {
    if (deferredGlobalProvidersMounted) {
        return;
    }

    deferredGlobalProvidersMounted = true;
    for (const resolve of mountedResolvers) {
        resolve();
    }
    mountedResolvers.clear();
};

export const ensureDeferredGlobalProvidersReady = async () => {
    requestDeferredGlobalProviders();
    if (deferredGlobalProvidersMounted) {
        return;
    }

    await new Promise<void>((resolve) => {
        mountedResolvers.add(resolve);
    });
};

export default function DeferredGlobalProviderGate() {
    const [active, setActive] = useState(shouldMountDeferredGlobalProviders);

    useEffect(() => {
        const handleMountRequest = () => {
            setActive(true);
        };
        mountListeners.add(handleMountRequest);

        const idleWindow = window as Window & {
            requestIdleCallback?: (
                callback: IdleRequestCallback,
                options?: IdleRequestOptions,
            ) => number;
            cancelIdleCallback?: (id: number) => void;
        };

        let timeoutId: number | undefined;
        let idleId: number | undefined;

        if (!shouldMountDeferredGlobalProviders) {
            if (typeof idleWindow.requestIdleCallback === "function") {
                idleId = idleWindow.requestIdleCallback(
                    () => requestDeferredGlobalProviders(),
                    { timeout: 1200 },
                );
            } else {
                timeoutId = window.setTimeout(
                    () => requestDeferredGlobalProviders(),
                    240,
                );
            }
        }

        return () => {
            mountListeners.delete(handleMountRequest);
            if (
                idleId !== undefined &&
                typeof idleWindow.cancelIdleCallback === "function"
            ) {
                idleWindow.cancelIdleCallback(idleId);
            }
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    if (!active) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <DeferredGlobalProviders />
        </Suspense>
    );
}
