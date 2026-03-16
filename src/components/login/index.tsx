/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */

import { Collapsible } from "radix-ui";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import loginWallpaper from "@/assets/arknightswall9.jpg";
import { useIntl } from "@/locale";
import { useIsLogin, useUserStore } from "@/store/user";

const loaded = import("@/api/storage");

const loadStorageAPI = async () => {
    const lib = await loaded;
    return lib.StorageAPI;
};

const primaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,box-shadow,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-xl active:translate-y-0 h-10 px-4 py-2`;

const _secondaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,box-shadow,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary/88 hover:shadow-md active:translate-y-0 h-10 px-4 py-2 w-full`;

export default function Login() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const { loading, forceLoginUI, setForceLoginUI } = useUserStore(
        useShallow((state) => ({
            loading: state.loading,
            forceLoginUI: state.forceLoginUI,
            setForceLoginUI: state.setForceLoginUI,
        })),
    );

    if (isLogin && !forceLoginUI) {
        return null;
    }
    return createPortal(
        <div className="fixed z-[50] top-0 right-0 w-screen h-screen overflow-y-auto overscroll-contain">
            <div
                className="login-backdrop absolute w-full h-full z-[-1]"
                style={{
                    backgroundImage: `linear-gradient(rgba(10, 10, 10, 0.46), rgba(10, 10, 10, 0.72)), url(${loginWallpaper})`,
                }}
            ></div>
            <div className="login-screen-shell w-full min-h-full flex justify-center items-start sm:items-center p-3 sm:p-6">
                <div className="login-shell login-card bg-background/80 w-full max-w-[460px] sm:max-w-[1024px] h-fit sm:max-h-[calc(100vh-64px)] grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] overflow-hidden border border-white/10 rounded-[32px] shadow-2xl">
                    <Guide wallpaper={loginWallpaper} />
                    <div className="login-panel relative flex flex-col overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] pointer-events-none"></div>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 sm:px-7">
                            <div className="flex flex-col">
                                {forceLoginUI && isLogin && (
                                    <button
                                        type="button"
                                        className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => setForceLoginUI(false)}
                                    >
                                        <i className="icon-[mdi--arrow-left] size-3"></i>
                                        {t("back")}
                                    </button>
                                )}
                                <span className="login-mobile-tip text-xs leading-5 text-muted-foreground mr-12">
                                    {t("app-introduce")}
                                </span>
                            </div>
                            <a
                                className="text-xs text-muted-foreground underline underline-offset-4"
                                target="_blank"
                                href="https://Rakko.cn"
                                rel="noopener"
                            >
                                {t("see-introduce")}
                            </a>
                        </div>
                        <div className="login-panel-body px-4 pb-4 sm:px-6 sm:pb-6">
                            <div className="login-panel-stack flex flex-col gap-4">
                                {loading ? (
                                    <div className="text-sm flex items-center gap-2 rounded-2xl border bg-card/60 px-4 py-4">
                                        <i className="icon-[mdi--loading] animate-spin text-primary"></i>
                                        {t("login")}
                                    </div>
                                ) : (
                                    <div className="login-section login-section-surface flex flex-col gap-3 rounded-[22px] border bg-card/70 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-base font-semibold">
                                                    {t(
                                                        "login-with-github-token",
                                                    )}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground leading-5">
                                                    {t(
                                                        "login-github-token-description",
                                                    )}
                                                </div>
                                            </div>
                                            <div className="login-badge">
                                                GitHub
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className={`${primaryButtonStyle}`}
                                            onClick={async () => {
                                                const StorageAPI =
                                                    await loadStorageAPI();
                                                StorageAPI.loginManuallyWith(
                                                    "github",
                                                );
                                            }}
                                        >
                                            <i className="icon-[mdi--key-variant]"></i>
                                            <div className="flex-1">
                                                {t("login-with-github-token")}
                                            </div>
                                        </button>
                                        <Collapsible.Root className="group rounded-2xl border border-border/70 bg-background/60 transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:bg-background/80 data-[state=open]:shadow-sm">
                                            <Collapsible.Trigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-medium cursor-pointer">
                                                <span>
                                                    {t(
                                                        "login-token-guide-title",
                                                    )}
                                                </span>
                                                <i className="icon-[mdi--chevron-down] transition-transform duration-200 group-data-[state=open]:rotate-180"></i>
                                            </Collapsible.Trigger>
                                            <Collapsible.Content className="data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close data-[state=closed]:overflow-hidden">
                                                <div className="border-t border-border/60 px-4 py-4 text-xs leading-5 text-muted-foreground flex flex-col gap-2">
                                                    <div>
                                                        {t(
                                                            "login-token-guide-step1",
                                                        )}
                                                    </div>
                                                    <div>
                                                        {t(
                                                            "login-token-guide-step2",
                                                        )}
                                                    </div>
                                                    <div>
                                                        {t(
                                                            "login-token-guide-step3",
                                                        )}
                                                    </div>
                                                    <div>
                                                        {t(
                                                            "login-token-guide-step4",
                                                        )}
                                                    </div>
                                                    <div>
                                                        {t(
                                                            "login-token-guide-step5",
                                                        )}
                                                    </div>
                                                </div>
                                            </Collapsible.Content>
                                        </Collapsible.Root>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Guide({ wallpaper }: { wallpaper: string }) {
    const t = useIntl();
    return (
        <div className="login-hero text-white relative overflow-hidden hidden sm:flex flex-col">
            <div
                className="login-hero-wallpaper absolute inset-0 scale-105"
                style={{
                    backgroundImage: `url(${wallpaper})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 22%",
                }}
            ></div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,17,17,0.18),rgba(24,17,17,0.72))]"></div>
            <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-black/18 px-3 py-1 text-[11px] tracking-[0.24em] uppercase text-white/88 backdrop-blur-sm">
                    KurisuRakko
                </div>
                <div className="flex flex-col gap-4">
                    <h1 className="max-w-[10ch] text-4xl leading-none font-semibold sm:text-5xl drop-shadow-[0_10px_36px_rgba(0,0,0,0.42)]">
                        {t("APP_NAME")}
                    </h1>
                    <p className="max-w-[32ch] text-sm leading-6 text-white/88 sm:text-base">
                        {t("app-introduce")}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="login-stat">
                        <span className="login-stat-label">Sync</span>
                        <span className="login-stat-value">GitHub Token</span>
                    </div>
                    <div className="login-stat">
                        <span className="login-stat-label">Mode</span>
                        <span className="login-stat-value">PWA / Local</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
