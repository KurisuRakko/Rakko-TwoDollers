import type { HtmlHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils";

export function BaseButton({
    children,
    className,
    ...props
}: { children?: ReactNode } & HtmlHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            className={cn(
                "nav-add-button w-18 h-18 sm:w-14 sm:h-14 rounded-full flex items-center justify-center m-1 cursor-pointer",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
