import { createPortal } from "react-dom";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/use-theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme } = useTheme();

    return createPortal(
        <Sonner
            theme={theme}
            className="toaster group !mt-[env(safe-area-inset-top)] !mb-[env(safe-area-inset-bottom)] pointer-events-auto"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success: "[&_[data-icon]]:text-green-500",
                    warning: "[&_[data-icon]]:text-orange-500",
                    error: "[&_[data-icon]]:text-destructive",
                },
            }}
            {...props}
        />,
        document.body,
    );
};

export { Toaster };
