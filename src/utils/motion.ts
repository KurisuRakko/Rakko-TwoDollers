import type { Transition, Variants } from "motion/react";

export type MotionPageDirection = -1 | 0 | 1;

export const IOS_PAGE_EASE = [0.32, 0.72, 0, 1] as const;
export const IOS_EMPHASIZED_EASE = [0.22, 1, 0.36, 1] as const;
export const IOS_EXIT_EASE = [0.4, 0, 1, 1] as const;

export const pagePushTransition: Transition = {
    type: "tween",
    ease: IOS_PAGE_EASE,
    duration: 0.42,
};

export const sheetTransition: Transition = {
    type: "tween",
    ease: IOS_PAGE_EASE,
    duration: 0.38,
};

export const fadeTransition: Transition = {
    type: "tween",
    ease: IOS_EMPHASIZED_EASE,
    duration: 0.28,
};

export const surfaceTransition: Transition = {
    type: "tween",
    ease: IOS_EMPHASIZED_EASE,
    duration: 0.32,
};

export const panelSpringTransition: Transition = {
    type: "spring",
    stiffness: 320,
    damping: 30,
    mass: 1,
};

export const sharedElementTransition: Transition = {
    type: "spring",
    stiffness: 190,
    damping: 28,
    mass: 1.12,
};

export const microInteractionTransition: Transition = {
    type: "spring",
    stiffness: 520,
    damping: 34,
    mass: 0.7,
};

export const getPageEnterProps = ({
    direction,
    isDesktop,
    reducedMotion,
}: {
    direction: MotionPageDirection;
    isDesktop: boolean;
    reducedMotion: boolean;
}) => {
    if (reducedMotion) {
        return {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.18 },
        };
    }

    return {
        initial: isDesktop
            ? { opacity: 0, y: 14, scale: 0.995 }
            : { opacity: 0, x: direction === 0 ? 0 : direction * 28 },
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        transition: isDesktop ? surfaceTransition : pagePushTransition,
    };
};

export const getStageProps = ({
    index = 0,
    reducedMotion,
    y = 18,
    delay = 0,
}: {
    index?: number;
    reducedMotion: boolean;
    y?: number;
    delay?: number;
}) => {
    if (reducedMotion) {
        return {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.16, delay: 0 },
        };
    }

    return {
        initial: { opacity: 0, y, scale: 0.988, filter: "blur(4px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        transition: {
            duration: 0.36,
            ease: IOS_EMPHASIZED_EASE,
            delay: delay + Math.min(index * 0.05, 0.22),
        },
    };
};

export const stateSurfaceVariants: Variants = {
    initial: {
        opacity: 0,
        y: 12,
        scale: 0.992,
        filter: "blur(4px)",
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
    },
    exit: {
        opacity: 0,
        y: -8,
        scale: 0.99,
        filter: "blur(4px)",
    },
};

export const reducedStateSurfaceVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};
