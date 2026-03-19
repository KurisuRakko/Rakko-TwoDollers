import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import UserAvatarImage from "@/components/user-avatar";
import { cn } from "@/utils";
import {
    panelSpringTransition,
    sharedElementTransition,
    surfaceTransition,
} from "@/utils/motion";
import type { StartupOverlayMode } from "./controller";
import { setStartupOverlayAvatarRect } from "./controller";
import "./style.css";

export default function StartupOverlay({
    avatarSource,
    displayName,
    exitFlightTarget,
    exitSourceRect,
    isExiting = false,
    layoutId,
    mode = "startup",
    status,
}: {
    avatarSource?: string;
    displayName: string;
    exitFlightTarget?: {
        scale: number;
        x: number;
        y: number;
    } | null;
    exitSourceRect?: {
        height: number;
        left: number;
        top: number;
        width: number;
    } | null;
    isExiting?: boolean;
    layoutId?: string;
    mode?: StartupOverlayMode;
    status: string;
}) {
    const reducedMotion = Boolean(useReducedMotion());
    const avatarShellRef = useRef<HTMLDivElement>(null);
    const backdropAnimate = {
        opacity: isExiting ? 0 : 1,
        transition: {
            delay: exitFlightTarget && !reducedMotion ? 0.08 : 0,
            duration: reducedMotion ? 0.16 : 0.22,
        },
    };
    let contentAnimate: {
        opacity: number;
        scale: number;
        y: number;
    };
    let avatarAnimate:
        | {
              opacity: number;
              scale: number;
              x: number;
              y: number;
          }
        | {
              opacity: number;
              scale: number;
              x: number;
              y: number;
              transition: {
                  duration: number;
                  ease: readonly [number, number, number, number];
              };
          };
    let copyAnimate:
        | {
              opacity: number;
              y: number;
          }
        | {
              opacity: number;
              y: number;
          };
    const useFixedExitAvatar =
        !reducedMotion &&
        Boolean(isExiting && exitFlightTarget && exitSourceRect);

    if (reducedMotion) {
        contentAnimate = { opacity: isExiting ? 0 : 1, y: 0, scale: 1 };
        avatarAnimate = {
            opacity: isExiting ? 0 : 1,
            scale: 1,
            x: 0,
            y: 0,
        };
        copyAnimate = { opacity: isExiting ? 0 : 1, y: 0 };
    } else if (isExiting && exitFlightTarget) {
        contentAnimate = { opacity: 1, y: 0, scale: 1 };
        avatarAnimate = {
            opacity: 0,
            scale: exitFlightTarget.scale,
            x: exitFlightTarget.x,
            y: exitFlightTarget.y,
            transition: {
                duration: 0.52,
                ease: [0.22, 1, 0.36, 1] as const,
            },
        };
        copyAnimate = {
            opacity: 0,
            y: -18,
        };
    } else if (isExiting) {
        contentAnimate = { opacity: 0, y: -8, scale: 0.99 };
        avatarAnimate = {
            opacity: 0,
            scale: 0.92,
            x: 0,
            y: -10,
            transition: {
                duration: 0.22,
                ease: [0.4, 0, 1, 1] as const,
            },
        };
        copyAnimate = {
            opacity: 0,
            y: -10,
        };
    } else {
        contentAnimate = { opacity: 1, y: 0, scale: 1 };
        avatarAnimate = { opacity: 1, scale: 1, x: 0, y: 0 };
        copyAnimate = { opacity: 1, y: 0 };
    }

    useLayoutEffect(() => {
        const updateRect = () => {
            const rect = avatarShellRef.current?.getBoundingClientRect();
            if (!rect) {
                return;
            }

            setStartupOverlayAvatarRect({
                height: rect.height,
                left: rect.left,
                top: rect.top,
                width: rect.width,
            });
        };

        updateRect();
        const frameId = window.requestAnimationFrame(updateRect);
        window.addEventListener("resize", updateRect);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("resize", updateRect);
        };
    }, []);

    useEffect(() => {
        return () => {
            setStartupOverlayAvatarRect(null);
        };
    }, []);

    return (
        <div className={cn("startup-overlay", `startup-overlay--${mode}`)}>
            <motion.div
                className="startup-overlay__backdrop"
                initial={{ opacity: 0 }}
                animate={backdropAnimate}
            />
            <motion.div
                className="startup-overlay__content"
                initial={
                    reducedMotion
                        ? { opacity: 1 }
                        : { opacity: 0, y: 18, scale: 0.98 }
                }
                animate={contentAnimate}
                transition={
                    reducedMotion
                        ? { duration: 0.16 }
                        : {
                              ...panelSpringTransition,
                              opacity: { duration: 0.2 },
                          }
                }
            >
                {useFixedExitAvatar ? (
                    <div
                        ref={avatarShellRef}
                        className="startup-overlay__avatar-shell startup-overlay__avatar-shell--placeholder"
                    />
                ) : (
                    <motion.div
                        ref={avatarShellRef}
                        layoutId={layoutId}
                        transition={
                            reducedMotion
                                ? { duration: 0.16 }
                                : sharedElementTransition
                        }
                        animate={avatarAnimate}
                        className="startup-overlay__avatar-shell"
                    >
                        <UserAvatarImage
                            source={avatarSource}
                            alt={displayName}
                            className="startup-overlay__avatar-image"
                        />
                    </motion.div>
                )}
                <motion.div
                    className="startup-overlay__copy"
                    initial={{ opacity: 1, y: 0 }}
                    animate={copyAnimate}
                    transition={
                        reducedMotion ? { duration: 0.16 } : surfaceTransition
                    }
                >
                    <div className="startup-overlay__name">{displayName}</div>
                    <div className="startup-overlay__status">{status}</div>
                    <div
                        className="startup-overlay__spinner"
                        aria-hidden="true"
                    >
                        {mode === "manual-sync" && (
                            <span className="startup-overlay__spinner-ring"></span>
                        )}
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </motion.div>
            </motion.div>
            {useFixedExitAvatar && exitSourceRect && (
                <motion.div
                    animate={avatarAnimate}
                    className="startup-overlay__avatar-shell startup-overlay__avatar-shell--flying"
                    style={{
                        height: exitSourceRect.height,
                        left: exitSourceRect.left,
                        top: exitSourceRect.top,
                        width: exitSourceRect.width,
                    }}
                    transition={
                        "transition" in avatarAnimate
                            ? avatarAnimate.transition
                            : reducedMotion
                              ? { duration: 0.16 }
                              : sharedElementTransition
                    }
                >
                    <UserAvatarImage
                        source={avatarSource}
                        alt={displayName}
                        className="startup-overlay__avatar-image"
                    />
                </motion.div>
            )}
        </div>
    );
}
