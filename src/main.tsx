import "./utils/shim";
import "@/utils/fetch-proxy";

import { StrictMode, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import Login from "./components/login";
import {
    releaseRootStartupOverlay,
    showRootStartupOverlay,
} from "./components/startup-overlay/controller";
import GlobalStartupOverlay from "./components/startup-overlay/global";
import { useCurrentUserDisplay } from "./hooks/use-user-display";
import { useIntl } from "./locale";
import { initIntl, LocaleProvider } from "./locale/index";
import { usePreferenceStore } from "./store/preference";
import { register as registerLaunchQueue } from "./utils/launch-queue";
import { lazyWithReload } from "./utils/lazy";

const Rooot = lazyWithReload(() => import("./route"), undefined, {
    preload: "immediate",
});

function AppStartupFallback() {
    const t = useIntl();
    const { avatarSource, displayName } = useCurrentUserDisplay();

    useEffect(() => {
        showRootStartupOverlay({
            avatarSource,
            displayName: displayName || t("APP_NAME"),
            status: t("home-startup-loading"),
        });

        return () => {
            releaseRootStartupOverlay();
        };
    }, [avatarSource, displayName, t]);

    return null;
}

const lang = usePreferenceStore.getState().locale;
initIntl(lang).then(() => {
    createRoot(document.getElementById("root")!).render(
        <StrictMode>
            <LocaleProvider>
                <Suspense fallback={<AppStartupFallback />}>
                    <Rooot />
                </Suspense>
                <GlobalStartupOverlay />
                <Login />
            </LocaleProvider>
        </StrictMode>,
    );
});

registerLaunchQueue();
