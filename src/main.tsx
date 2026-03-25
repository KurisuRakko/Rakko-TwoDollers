import "./utils/shim";
import "@/utils/fetch-proxy";

import { StrictMode, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useShallow } from "zustand/shallow";
import "./index.css";

import {
    releaseRootStartupOverlay,
    showRootStartupOverlay,
} from "./components/startup-overlay/controller";
import GlobalStartupOverlay from "./components/startup-overlay/global";
import { useCurrentUserDisplay } from "./hooks/use-user-display";
import { useIntl } from "./locale";
import { initIntl, LocaleProvider } from "./locale/index";
import { usePreferenceStore } from "./store/preference";
import { useIsLogin, useUserStore } from "./store/user";
import { register as registerLaunchQueue } from "./utils/launch-queue";
import { lazyWithReload } from "./utils/lazy";

const Rooot = lazyWithReload(() => import("./route"), undefined, {
    preload: "immediate",
});
const Login = lazyWithReload(() => import("./components/login"), undefined, {
    preload: false,
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

function LoginGate() {
    const isLogin = useIsLogin();
    const { loading, forceLoginUI } = useUserStore(
        useShallow((state) => ({
            loading: state.loading,
            forceLoginUI: state.forceLoginUI,
        })),
    );

    if (loading && !forceLoginUI) {
        return null;
    }

    if (isLogin && !forceLoginUI) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <Login />
        </Suspense>
    );
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
                <LoginGate />
            </LocaleProvider>
        </StrictMode>,
    );
});

registerLaunchQueue();
