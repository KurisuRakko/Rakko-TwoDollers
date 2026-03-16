import type React from "react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "theme";

type ThemeContextValue = {
    theme: Theme;
    setTheme: (t: Theme) => void;
    toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyThemeClass(theme: Theme) {
    const el = document.documentElement;
    if (!el) return;
    if (theme === "dark") {
        el.classList.add("dark");
    } else if (theme === "light") {
        el.classList.remove("dark");
    } else {
        const prefersDark =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) el.classList.add("dark");
        else el.classList.remove("dark");
    }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
            return (stored ?? "system") as Theme;
        } catch {
            return "system";
        }
    });

    useEffect(() => {
        applyThemeClass(theme);

        if (
            theme === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia
        ) {
            const mq = window.matchMedia("(prefers-color-scheme: dark)");
            const handler = () => applyThemeClass("system");

            if (mq.addEventListener) mq.addEventListener("change", handler);
            else if ((mq as MediaQueryList & { addListener?: any }).addListener)
                (mq as MediaQueryList & { addListener?: any }).addListener(
                    handler,
                );

            return () => {
                if (mq.removeEventListener)
                    mq.removeEventListener("change", handler);
                else if (
                    (mq as MediaQueryList & { removeListener?: any })
                        .removeListener
                )
                    (
                        mq as MediaQueryList & { removeListener?: any }
                    ).removeListener(handler);
            };
        }
    }, [theme]);

    const setTheme = useCallback((nextTheme: Theme) => {
        try {
            if (nextTheme === "system") localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch {
            // ignore storage errors
        }
        setThemeState(nextTheme);
    }, []);

    const toggle = useCallback(() => {
        setThemeState((prev) => {
            const nextTheme = prev === "dark" ? "light" : "dark";
            try {
                localStorage.setItem(STORAGE_KEY, nextTheme);
            } catch {
                // ignore storage errors
            }
            return nextTheme;
        });
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggle }),
        [theme, setTheme, toggle],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
};

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}
