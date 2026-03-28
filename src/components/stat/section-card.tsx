import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "@/utils";

type StatSectionCardProps = {
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    headerClassName?: string;
    bodyClassName?: string;
};

export function StatSectionCard({
    title,
    description,
    icon,
    actions,
    children,
    className,
    headerClassName,
    bodyClassName,
}: StatSectionCardProps) {
    const hasHeader = Boolean(title || description || icon || actions);

    return (
        <div className={cn("stat-card stat-section-card", className)}>
            {hasHeader && (
                <div className={cn("stat-section-header", headerClassName)}>
                    <div className="stat-section-heading">
                        {icon && (
                            <div className="stat-section-icon">{icon}</div>
                        )}
                        <div className="stat-section-copy">
                            {title && (
                                <div className="stat-section-title">
                                    {title}
                                </div>
                            )}
                            {description && (
                                <div className="stat-section-description">
                                    {description}
                                </div>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className="stat-section-actions">{actions}</div>
                    )}
                </div>
            )}
            <div className={cn("stat-section-body", bodyClassName)}>
                {children}
            </div>
        </div>
    );
}

export function StatHeaderIconButton({
    active,
    className,
    type,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
}) {
    return (
        <button
            type={type ?? "button"}
            className={cn(
                "stat-header-icon-button",
                active && "stat-header-icon-button-active",
                className,
            )}
            {...props}
        />
    );
}

export function StatLegendItem({
    label,
    color,
    active = true,
    className,
}: {
    label: ReactNode;
    color: string;
    active?: boolean;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "stat-legend-item",
                !active && "stat-legend-item-muted",
                className,
            )}
            style={
                {
                    "--stat-legend-color": color,
                } as CSSProperties
            }
        >
            <span className="stat-legend-swatch" />
            <span className="stat-legend-label">{label}</span>
        </div>
    );
}

export function StatMetaPill({
    children,
    className,
    strong,
}: {
    children: ReactNode;
    className?: string;
    strong?: boolean;
}) {
    return (
        <span
            className={cn(
                "stat-meta-pill",
                strong && "stat-meta-pill-strong",
                className,
            )}
        >
            {children}
        </span>
    );
}
