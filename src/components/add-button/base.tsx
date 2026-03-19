import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/utils";
import {
    microHover,
    microInteractionTransition,
    microPress,
} from "@/utils/motion";

export function BaseButton({
    children,
    className,
    ...props
}: { children?: ReactNode } & HTMLMotionProps<"button">) {
    const prefersReducedMotion = Boolean(useReducedMotion());

    return (
        <motion.button
            type="button"
            whileTap={prefersReducedMotion ? undefined : microPress}
            whileHover={prefersReducedMotion ? undefined : microHover}
            transition={microInteractionTransition}
            className={cn(
                "nav-add-button w-18 h-18 sm:w-14 sm:h-14 rounded-full flex items-center justify-center m-1 cursor-pointer",
                className,
            )}
            {...props}
        >
            <span className="nav-icon">{children}</span>
        </motion.button>
    );
}
