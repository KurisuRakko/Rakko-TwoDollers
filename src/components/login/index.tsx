/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation> */

import { Collapsible } from "radix-ui";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";
import { useIntl } from "@/locale";
import { useIsLogin, useUserStore } from "@/store/user";
import loginWallpaper from "../../../arknightswall9.jpg";

const loaded = import("@/api/storage");

const loadStorageAPI = async () => {
    const lib = await loaded;
    return lib.StorageAPI;
};

const primaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,box-shadow,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-xl active:translate-y-0 h-10 px-4 py-2`;

const secondaryButtonStyle = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,box-shadow,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:bg-secondary/88 hover:shadow-md active:translate-y-0 h-10 px-4 py-2 w-full`;

export default function Login() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const [loading] = useUserStore(
        useShallow((state) => {
            return [state.loading];
        }),
    );
    if (isLogin) {
        return null;
    }
    return createPortal(
        <div className="fixed z-[1] top-0 right-0 w-screen h-screen overflow-y-auto overscroll-contain">
            <div
                className="login-backdrop absolute w-full h-full z-[-1]"
                style={{
                    backgroundImage: `linear-gradient(rgba(10, 10, 10, 0.46), rgba(10, 10, 10, 0.72)), url(${loginWallpaper})`,
                }}
            ></div>
            <div className="login-screen-shell w-full min-h-full flex justify-center items-start sm:items-center p-3 sm:p-6">
                <div className="login-shell login-card bg-background/72 w-full max-w-[1080px] max-h-none sm:max-h-[calc(100vh-48px)] grid overflow-visible sm:overflow-hidden border border-white/10 rounded-[28px]">
                    <div className="login-card-glow absolute inset-x-10 top-6 h-24 rounded-full bg-amber-100/12 blur-3xl pointer-events-none"></div>
                    <Guide wallpaper={loginWallpaper} />
                    <div className="login-panel relative flex flex-col overflow-visible sm:overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] pointer-events-none"></div>
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 sm:px-7">
                            <div className="flex flex-col">
                                <span className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                                    {t("app-brand")}
                                </span>
                                <span className="text-lg font-semibold">
                                    {t("APP_NAME")}
                                </span>
                                <span className="login-mobile-tip mt-2 text-xs leading-5 text-muted-foreground">
                                    {t("login-choose-mode-tip")}
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
                                    <>
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
                                                    {t(
                                                        "login-with-github-token",
                                                    )}
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
                                        <div className="login-section login-section-surface flex flex-col gap-3 rounded-[22px] border bg-card/70 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-base font-semibold">
                                                        {t("offline-mode")}
                                                    </div>
                                                    <div className="mt-1 text-xs text-muted-foreground leading-5">
                                                        {t(
                                                            "login-offline-description",
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="login-badge login-badge-muted">
                                                    Local
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className={`${secondaryButtonStyle}`}
                                                onClick={async () => {
                                                    const StorageAPI =
                                                        await loadStorageAPI();
                                                    StorageAPI.loginWith(
                                                        "offline",
                                                    );
                                                }}
                                            >
                                                <i className="icon-[mdi--local]"></i>
                                                <div className="flex-1">
                                                    {t("offline-mode")}
                                                </div>
                                            </button>
                                        </div>
                                        <div className="login-help-card login-section login-section-surface rounded-[22px] border bg-gradient-to-br from-muted/55 to-background/78 p-4 text-xs leading-5 flex-col gap-3 backdrop-blur-sm">
                                            <div className="font-semibold text-foreground text-sm">
                                                {t("login-help-title")}
                                            </div>
                                            <div className="login-help-row">
                                                <span className="font-medium text-foreground">
                                                    {t(
                                                        "login-help-github-title",
                                                    )}
                                                </span>{" "}
                                                {t("login-help-github-body")}
                                            </div>
                                            <div className="login-help-row">
                                                <span className="font-medium text-foreground">
                                                    {t(
                                                        "login-help-offline-title",
                                                    )}
                                                </span>{" "}
                                                {t("login-help-offline-body")}
                                            </div>
                                        </div>
                                    </>
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
        <div className="login-hero text-white relative overflow-hidden">
            <div
                className="login-hero-wallpaper absolute inset-0 scale-105"
                style={{
                    backgroundImage: `url(${wallpaper})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center 22%",
                }}
            ></div>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,17,17,0.18),rgba(24,17,17,0.72))]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,196,148,0.18),transparent_26%)]"></div>
            <div className="absolute inset-x-10 top-[-42px] h-24 rounded-full bg-white/12 blur-2xl"></div>
            <div className="login-hero-spark absolute right-8 top-6 h-18 w-18 rounded-full border border-white/18 bg-white/8"></div>
            <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/18 bg-black/18 px-3 py-1 text-[11px] tracking-[0.24em] uppercase text-white/88 backdrop-blur-sm">
                    KurisuRakko
                </div>
                <div className="flex flex-col gap-4">
                    <div className="login-kicker">{t("app-brand")}</div>
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
