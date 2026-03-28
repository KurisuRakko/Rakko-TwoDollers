import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    microHover,
    microInteractionTransition,
    microPress,
    sharedElementTransition,
} from "@/utils/motion";
import Money from "../money";

export const FocusTypes = ["income", "expense", "balance"] as const;
export type FocusType = (typeof FocusTypes)[number];

export function FocusTypeSelector({
    value: focusType,
    onValueChange: setFocusType,
    money,
}: {
    value: FocusType;
    onValueChange: (v: FocusType) => void;
    money: number[];
}) {
    const t = useIntl();
    const prefersReducedMotion = Boolean(useReducedMotion());
    const layoutGroupId = useId();
    return (
        <LayoutGroup id={layoutGroupId}>
            <div className="stat-focus-toggle">
                <motion.button
                    type="button"
                    whileHover={prefersReducedMotion ? undefined : microHover}
                    whileTap={prefersReducedMotion ? undefined : microPress}
                    transition={microInteractionTransition}
                    className={cn(
                        "stat-focus-button",
                        focusType === "income" && "stat-focus-button-active",
                    )}
                    onClick={() => {
                        setFocusType("income");
                    }}
                >
                    {focusType === "income" && (
                        <motion.span
                            layoutId="stat-focus-indicator"
                            transition={sharedElementTransition}
                            className="nav-active-indicator"
                        />
                    )}
                    <div className="stat-focus-copy">
                        <span className="stat-focus-value text-semantic-income">
                            +<Money value={money[0]} />
                        </span>
                        <div className="stat-focus-label">{t("income")}</div>
                    </div>
                </motion.button>
                <motion.button
                    type="button"
                    whileHover={prefersReducedMotion ? undefined : microHover}
                    whileTap={prefersReducedMotion ? undefined : microPress}
                    transition={microInteractionTransition}
                    className={cn(
                        "stat-focus-button",
                        focusType === "expense" && "stat-focus-button-active",
                    )}
                    onClick={() => setFocusType("expense")}
                >
                    {focusType === "expense" && (
                        <motion.span
                            layoutId="stat-focus-indicator"
                            transition={sharedElementTransition}
                            className="nav-active-indicator"
                        />
                    )}
                    <div className="stat-focus-copy">
                        <span className="stat-focus-value text-semantic-expense">
                            -<Money value={money[1]} />
                        </span>
                        <div className="stat-focus-label">{t("expense")}</div>
                    </div>
                </motion.button>
                <motion.button
                    type="button"
                    whileHover={prefersReducedMotion ? undefined : microHover}
                    whileTap={prefersReducedMotion ? undefined : microPress}
                    transition={microInteractionTransition}
                    className={cn(
                        "stat-focus-button",
                        focusType === "balance" && "stat-focus-button-active",
                    )}
                    onClick={() => setFocusType("balance")}
                >
                    {focusType === "balance" && (
                        <motion.span
                            layoutId="stat-focus-indicator"
                            transition={sharedElementTransition}
                            className="nav-active-indicator"
                        />
                    )}
                    <div className="stat-focus-copy">
                        <span className="stat-focus-value">
                            <Money value={money[2]} />
                        </span>
                        <div className="stat-focus-label">{t("Balance")}</div>
                    </div>
                </motion.button>
            </div>
        </LayoutGroup>
    );
}
