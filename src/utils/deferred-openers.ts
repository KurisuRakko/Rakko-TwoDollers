import { ensureDeferredGlobalProvidersReady } from "@/layouts/deferred-global-provider-gate";
import type { Budget } from "@/components/budget/type";

export const openSettings = async () => {
    const [{ showSettings }] = await Promise.all([
        import("@/components/settings"),
        ensureDeferredGlobalProvidersReady(),
    ]);
    return showSettings();
};

export const openUserCenter = async () => {
    const [{ showUserCenter }] = await Promise.all([
        import("@/components/settings/user-center"),
        ensureDeferredGlobalProvidersReady(),
    ]);
    return showUserCenter();
};

export const openIncomingScheduled = async () => {
    const [{ showIncomingScheduled }] = await Promise.all([
        import("@/components/scheduled/incoming"),
        ensureDeferredGlobalProvidersReady(),
    ]);
    return showIncomingScheduled();
};

export const openBookGuide = async () => {
    const [{ showBookGuide }] = await Promise.all([
        import("@/components/book/util"),
        ensureDeferredGlobalProvidersReady(),
    ]);
    return showBookGuide();
};

export const openBudgetDetail = async (budget: Budget) => {
    const [{ showBudgetDetail }] = await Promise.all([
        import("@/components/budget/detail"),
        ensureDeferredGlobalProvidersReady(),
    ]);
    return showBudgetDetail(budget);
};
