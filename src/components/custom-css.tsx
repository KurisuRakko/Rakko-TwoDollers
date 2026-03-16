import { useEffect, useMemo } from "react";
import wallpaper from "@/assets/arknightswall9.jpg";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { useUserStore } from "@/store/user";

const STYLE_ID = "rakko-custom-css";

function getDefaultMainWallpaperCSS(wallpaperUrl: string) {
    return `
body.main-layout-active {
    background: transparent;
}

.dark body.main-layout-active {
    color-scheme: dark;
}

body.main-layout-active::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background-image: url("${wallpaperUrl}");
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    filter: none;
}

body.main-layout-active::after {
    content: none;
}

.dark body.main-layout-active::before {
    background-image: url("${wallpaperUrl}");
    filter: none;
}

.dark body.main-layout-active::after {
    content: none;
}

body.main-layout-active .nav-flat-button,
body.main-layout-active .nav-flat-group,
body.main-layout-active .nav-add-button,
body.main-layout-active .home-hero-panel,
body.main-layout-active .home-mini-card,
body.main-layout-active .home-promotion-shell,
body.main-layout-active .home-budget-shell,
body.main-layout-active .home-ledger-shell,
body.main-layout-active .home-promotion-card,
body.main-layout-active .home-budget-card,
body.main-layout-active .home-toolbar,
body.main-layout-active .home-toolbar-button,
body.main-layout-active .ledger-divider,
body.main-layout-active .bill-item {
    backdrop-filter: blur(22px) saturate(1.18);
    -webkit-backdrop-filter: blur(22px) saturate(1.18);
}

body.main-layout-active .ledger-divider {
    margin-right: 8px;
    border: 1px solid var(--home-border-strong);
    border-radius: 14px;
    background: var(--home-surface-strong) !important;
    box-shadow: var(--home-shadow);
}

body.main-layout-active .bill-item {
    border: 1px solid var(--home-border-strong);
    border-radius: 18px;
    background: linear-gradient(180deg, var(--home-surface-strong), var(--home-surface));
    box-shadow: var(--home-shadow);
    transition:
        background-color 280ms cubic-bezier(0.22, 1, 0.36, 1),
        border-color 280ms cubic-bezier(0.22, 1, 0.36, 1),
        box-shadow 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

body.main-layout-active .bill-item:hover {
    background: var(--home-surface);
    box-shadow: var(--home-shadow-raised);
}

body.main-layout-active .bill-item .bg-background {
    background-color: rgb(255 255 255 / 0.08) !important;
}

@media (max-width: 640px) {
    body.main-layout-active::before {
        background-position: 56% center;
    }
}

@media (prefers-reduced-motion: reduce) {
    body.main-layout-active .bill-item {
        animation: none !important;
        transition: none !important;
    }
}
`;
}

export default function CustomCSS() {
    const userId = useUserStore((state) => state.id);
    const mainWallpaper = usePreferenceStore((state) => state.mainWallpaper);
    const customCSS = useLedgerStore((state) => {
        if (userId === undefined || userId === null) {
            return "";
        }
        return state.infos?.meta.personal?.[userId]?.customCSS ?? "";
    });

    const cssText = useMemo(() => {
        return `${getDefaultMainWallpaperCSS(mainWallpaper || wallpaper)}\n${customCSS}`;
    }, [customCSS, mainWallpaper]);

    useEffect(() => {
        document.body.classList.add("main-layout-active");

        const style =
            document.getElementById(STYLE_ID) ??
            Object.assign(document.createElement("style"), {
                id: STYLE_ID,
            });

        if (!style.parentNode) {
            document.head.appendChild(style);
        }

        style.textContent = cssText;

        return () => {
            document.body.classList.remove("main-layout-active");
            style.remove();
        };
    }, [cssText]);

    return null;
}
