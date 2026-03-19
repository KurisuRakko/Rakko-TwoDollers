import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import {
    microHover,
    microInteractionTransition,
    microPress,
    sharedElementTransition,
} from "@/utils/motion";
import ComplexAddButton from "./add-button";
import { goAddBill } from "./bill-editor";
import { afterAddBillPromotion } from "./promotion";
import { showSettings } from "./settings";

export default function Navigation({ hidden }: { hidden?: boolean }) {
    const location = useLocation();
    const navigate = useNavigate();
    const prefersReducedMotion = Boolean(useReducedMotion());
    const layoutGroupId = useId();

    const currentTab = useMemo(() => {
        return ["/stat", "/", "/search"].find((x) => location.pathname === x);
    }, [location.pathname]);

    if (hidden) return null;

    const switchTab = (value: "/" | "/stat" | "/search") => {
        navigate(`${value}`);
    };

    return createPortal(
        <LayoutGroup id={layoutGroupId}>
            <div
                className="floating-tab fixed w-screen h-18 flex items-center justify-around sm:h-screen
         sm:w-18 sm:flex-col sm:justify-start z-[20] pointer-events-auto
         bottom-[calc(.25rem+env(safe-area-inset-bottom))]
         sm:top-[env(safe-area-inset-top)] sm:left-[calc(.25rem+env(safe-area-inset-left))]
         backdrop-blur-md bg-background/30 rounded-full sm:rounded-none"
            >
                <motion.button
                    type="button"
                    whileHover={prefersReducedMotion ? undefined : microHover}
                    whileTap={prefersReducedMotion ? undefined : microPress}
                    transition={microInteractionTransition}
                    className={`nav-flat-button w-14 h-14 sm:w-10 sm:h-10 cursor-pointer flex items-center justify-center rounded-full m-2 ${
                        currentTab === "/search" ? "nav-flat-button-active" : ""
                    }`}
                    onClick={() => switchTab("/search")}
                >
                    {currentTab === "/search" && (
                        <motion.span
                            layoutId="nav-active-indicator"
                            transition={sharedElementTransition}
                            className="nav-active-indicator"
                        />
                    )}
                    <motion.span
                        className="nav-icon"
                        animate={
                            currentTab === "/search"
                                ? { y: -1, scale: 1.06 }
                                : { y: 0, scale: 1 }
                        }
                        transition={microInteractionTransition}
                    >
                        <i className="icon-[mdi--search] size-5"></i>
                    </motion.span>
                </motion.button>

                <div className="nav-flat-group flex items-center rounded-full w-56 h-14 m-2 sm:flex-col sm:w-10 sm:h-50 sm:-order-1">
                    <motion.button
                        type="button"
                        whileHover={
                            prefersReducedMotion ? undefined : microHover
                        }
                        whileTap={prefersReducedMotion ? undefined : microPress}
                        transition={microInteractionTransition}
                        className={`nav-flat-tab flex-1 h-full w-full flex items-center justify-center cursor-pointer ${
                            currentTab === "/" ? "nav-flat-tab-active" : ""
                        }`}
                        onClick={() => switchTab("/")}
                    >
                        {currentTab === "/" && (
                            <motion.span
                                layoutId="nav-active-indicator"
                                transition={sharedElementTransition}
                                className="nav-active-indicator"
                            />
                        )}
                        <motion.span
                            className="nav-icon"
                            animate={
                                currentTab === "/"
                                    ? { y: -1, scale: 1.06 }
                                    : { y: 0, scale: 1 }
                            }
                            transition={microInteractionTransition}
                        >
                            <i className="icon-[mdi--format-align-center] size-5"></i>
                        </motion.span>
                    </motion.button>

                    <ComplexAddButton
                        onClick={() => {
                            goAddBill();
                            afterAddBillPromotion();
                        }}
                    />

                    <motion.button
                        type="button"
                        whileHover={
                            prefersReducedMotion ? undefined : microHover
                        }
                        whileTap={prefersReducedMotion ? undefined : microPress}
                        transition={microInteractionTransition}
                        className={`nav-flat-tab flex-1 h-full w-full flex items-center justify-center cursor-pointer ${
                            currentTab === "/stat" ? "nav-flat-tab-active" : ""
                        }`}
                        onClick={() => switchTab("/stat")}
                    >
                        {currentTab === "/stat" && (
                            <motion.span
                                layoutId="nav-active-indicator"
                                transition={sharedElementTransition}
                                className="nav-active-indicator"
                            />
                        )}
                        <motion.span
                            className="nav-icon"
                            animate={
                                currentTab === "/stat"
                                    ? { y: -1, scale: 1.06 }
                                    : { y: 0, scale: 1 }
                            }
                            transition={microInteractionTransition}
                        >
                            <i className="icon-[mdi--chart-box-outline] size-5"></i>
                        </motion.span>
                    </motion.button>
                </div>

                <motion.button
                    type="button"
                    whileHover={prefersReducedMotion ? undefined : microHover}
                    whileTap={prefersReducedMotion ? undefined : microPress}
                    transition={microInteractionTransition}
                    className="nav-flat-button w-14 h-14 sm:w-10 sm:h-10 cursor-pointer flex items-center justify-center rounded-full m-2"
                    onClick={() => {
                        showSettings();
                    }}
                >
                    <motion.span
                        className="nav-icon"
                        whileHover={
                            prefersReducedMotion
                                ? undefined
                                : {
                                      rotate: 4,
                                      scale: 1.04,
                                      transition: microInteractionTransition,
                                  }
                        }
                    >
                        <i className="icon-[mdi--more-horiz] size-5"></i>
                    </motion.span>
                </motion.button>
            </div>
        </LayoutGroup>,
        document.body,
    );
}
