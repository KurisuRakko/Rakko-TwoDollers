/** biome-ignore-all lint/a11y/noStaticElementInteractions: metric rows are pointer-driven cards with nested display content */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: keyboard interactions are handled at higher-level stat cards */

import type { ReactNode } from "react";
import { cn } from "@/utils";
import { toFixed } from "@/utils/number";
import Money from "../money";
import { Progress } from "../ui/progress";
import type { FocusType } from "./focus-type";

export function StaticItem({
    children,
    money,
    percent,
    type,
    onClick,
    onMoneyClick,
    className,
}: {
    children: ReactNode;
    money: number;
    percent: number;
    type: FocusType;
    onClick?: () => void;
    onMoneyClick?: () => void;
    className?: string;
}) {
    return (
        <div className={cn("stat-metric-row", className)} onClick={onClick}>
            <div className="stat-metric-row-top">
                <div className="stat-metric-label">{children}</div>
                <div
                    className="stat-metric-value"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMoneyClick?.();
                    }}
                >
                    <div className="flex items-center gap-1">
                        <span>
                            {type === "expense"
                                ? "-"
                                : type === "income"
                                  ? "+"
                                  : ""}
                        </span>
                        <Money value={money} />
                    </div>
                    <i className="icon-[mdi--arrow-up-right]"></i>
                </div>
            </div>
            <div className="stat-metric-row-bottom">
                <div className="stat-metric-percent">
                    {toFixed(percent * 100, 2)}%
                </div>
                <Progress
                    value={percent * 100}
                    className={cn(
                        "stat-metric-progress [&>*]:opacity-100",
                        type === "expense"
                            ? "[&>*]:bg-semantic-expense"
                            : type === "income"
                              ? "[&>*]:bg-semantic-income"
                              : "[&>*]:bg-foreground/72",
                    )}
                />
            </div>
        </div>
    );
}

export function TagItem({
    name,
    total,
    ...props
}: {
    name: string;
    money: number;
    total: number;
    type: FocusType;
    onClick?: () => void;
}) {
    const percent = total === 0 ? 0 : props.money / total;
    return (
        <StaticItem percent={percent} {...props}>
            #{name}
        </StaticItem>
    );
}
