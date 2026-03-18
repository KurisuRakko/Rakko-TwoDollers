import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { BillEditorProvider } from "@/components/bill-editor";
import { BillInfoProvider } from "@/components/bill-info";
import { TagListProvider } from "@/components/bill-tag";
import BookGuide from "@/components/book";
import { BookConfirmProvider } from "@/components/book/util";
import { BudgetEditProvider, BudgetProvider } from "@/components/budget";
import { BudgetDetailProvider } from "@/components/budget/detail";
import { CategoryListProvider } from "@/components/category";
import { CurrencyListProvider } from "@/components/currency";
import CustomCSS from "@/components/custom-css";
import { ModalProvider } from "@/components/modal";
import {
    ScheduledEditProvider,
    ScheduledProvider,
} from "@/components/scheduled";
import { Settings } from "@/components/settings";
import { SortableListProvider } from "@/components/sortable";
import { SortableGroupProvider } from "@/components/sortable/group";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
    useQuickEntryByClipboard,
    useQuickGoAdd,
} from "@/hooks/use-quick-entry";
import { useScheduled } from "@/hooks/use-scheduled";
import { ThemeProvider } from "@/hooks/use-theme";
import { useBookStore } from "@/store/book";
import { useIsLogin, useUserStore } from "@/store/user";
import { cn } from "@/utils";

const DEFAULT_BOOK_NAME = "personal";

export default function MainLayout() {
    useQuickGoAdd();
    useQuickEntryByClipboard();

    // 自动周期记账
    const { applyScheduled } = useScheduled();
    const applyScheduledRef = useRef(applyScheduled);
    applyScheduledRef.current = applyScheduled;
    useEffect(() => {
        applyScheduledRef.current();
    }, []);

    const isLogin = useIsLogin();
    const userLoading = useUserStore((state) => state.loading);

    // Auto initialize the default book and recover a missing book selection.
    useEffect(() => {
        if (userLoading) {
            return;
        }

        const init = async () => {
            if (!isLogin) {
                return;
            }

            const bookStore = useBookStore.getState();
            let books = await bookStore.updateBookList();

            if (books.length === 0) {
                await bookStore.addBook(DEFAULT_BOOK_NAME);
                books = await bookStore.updateBookList();
            }

            const { currentBookId } = useBookStore.getState();
            const nextBook =
                books.find((book) => book.id === currentBookId) ??
                books.find((book) => book.name === DEFAULT_BOOK_NAME) ??
                books[0];

            if (nextBook && nextBook.id !== currentBookId) {
                await bookStore.switchToBook(nextBook.id);
            }
        };
        init();
    }, [isLogin, userLoading]);

    return (
        <ThemeProvider>
            <TooltipProvider>
                <CustomCSS />
                <div
                    className={cn(
                        "main-layout-content w-full h-full min-h-0 box-border",
                        isLogin && "sm:pl-18",
                    )}
                >
                    <Outlet />
                </div>
                <BillEditorProvider />
                <BillInfoProvider />
                <SortableListProvider />
                <SortableGroupProvider />
                <Settings />
                <CurrencyListProvider />
                <BookGuide />
                <BookConfirmProvider />
                <BudgetProvider />
                <BudgetEditProvider />
                <BudgetDetailProvider />
                <ScheduledProvider />
                <ScheduledEditProvider />
                <TagListProvider />
                <CategoryListProvider />
                <ModalProvider />
                <Toaster />
            </TooltipProvider>
        </ThemeProvider>
    );
}
