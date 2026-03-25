import { useEffect } from "react";
import { BillInfoProvider } from "@/components/bill-info";
import { TagListProvider } from "@/components/bill-tag";
import { BookConfirmProvider } from "@/components/book/util";
import { BudgetEditProvider } from "@/components/budget/budget-form";
import { BudgetDetailProvider } from "@/components/budget/detail";
import { BudgetProvider } from "@/components/budget/list-form";
import { CategoryListProvider } from "@/components/category/list-form";
import { CurrencyListProvider } from "@/components/currency/list-form";
import { ModalProvider } from "@/components/modal";
import { IncomingScheduledProvider } from "@/components/scheduled/incoming";
import { ScheduledProvider } from "@/components/scheduled/list-form";
import { ScheduledEditProvider } from "@/components/scheduled/scheduled-form";
import { Settings } from "@/components/settings";
import { SortableListProvider } from "@/components/sortable";
import { SortableGroupProvider } from "@/components/sortable/group";
import { markDeferredGlobalProvidersMounted } from "./deferred-global-provider-gate";

export default function DeferredGlobalProviders() {
    useEffect(() => {
        markDeferredGlobalProvidersMounted();
    }, []);

    return (
        <>
            <BillInfoProvider />
            <SortableListProvider />
            <SortableGroupProvider />
            <Settings />
            <BookConfirmProvider />
            <CurrencyListProvider />
            <BudgetProvider />
            <BudgetEditProvider />
            <BudgetDetailProvider />
            <ScheduledProvider />
            <ScheduledEditProvider />
            <IncomingScheduledProvider />
            <TagListProvider />
            <CategoryListProvider />
            <ModalProvider />
        </>
    );
}
