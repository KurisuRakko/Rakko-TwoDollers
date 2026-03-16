import type { ButtonHTMLAttributes, DetailedHTMLProps, ReactNode } from "react";
import { cn } from "@/utils";

export default function Tag({
    checked,
    children,
    onCheckedChange,
    className,
    ...props
}: {
    checked?: boolean;
    children: ReactNode;
    className?: string;
    onCheckedChange?: (v: boolean) => void;
} & DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
>) {
    return (
        <button
            type="button"
            {...props}
            data-state={checked ? "checked" : "uncheck"}
            className={cn(
                "tag-chip rounded-xl border py-1 px-3 flex items-center justify-center whitespace-nowrap cursor-pointer",
                "tag-chip-idle",
                className,
            )}
            onMouseDown={() => {
                onCheckedChange?.(!checked);
            }}
        >
            {children}
        </button>
    );
}
