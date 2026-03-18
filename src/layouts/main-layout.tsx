import { type TouchEvent, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
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
import { useIsDesktop } from "@/hooks/use-media-query";
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
const MAIN_SWIPE_ROUTES = ["/stat", "/", "/search"] as const;
const SWIPE_LOCK_DISTANCE = 14;
const SWIPE_TRIGGER_DISTANCE = 72;
const SWIPE_DIRECTION_RATIO = 1.2;

type MainSwipeRoute = (typeof MAIN_SWIPE_ROUTES)[number];

const resolveMainSwipeRoute = (
    pathname: string,
): MainSwipeRoute | undefined => {
    if (pathname === "/") {
        return "/";
    }
    if (pathname.startsWith("/search")) {
        return "/search";
    }
    if (pathname.startsWith("/stat")) {
        return "/stat";
    }
};

const isEditableTarget = (target: HTMLElement) => {
    return Boolean(
        target.closest(
            'input, textarea, select, [contenteditable="true"], [data-disable-page-swipe]',
        ),
    );
};

const hasHorizontalScrollParent = (
    target: HTMLElement,
    boundary: HTMLElement | null,
) => {
    let current: HTMLElement | null = target;
    while (current) {
        const style = window.getComputedStyle(current);
        const canScrollHorizontally =
            current.scrollWidth - current.clientWidth > 4;
        const overflowX = style.overflowX;
        if (
            canScrollHorizontally &&
            (overflowX === "auto" ||
                overflowX === "scroll" ||
                overflowX === "overlay")
        ) {
            return true;
        }
        if (current === boundary) {
            break;
        }
        current = current.parentElement;
    }
    return false;
};

export default function MainLayout() {
    useQuickGoAdd();
    useQuickEntryByClipboard();
    const location = useLocation();
    const navigate = useNavigate();
    const isDesktop = useIsDesktop();
    const swipeContainerRef = useRef<HTMLDivElement>(null);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const swipeLockedRef = useRef(false);
    const swipeCancelledRef = useRef(false);

    const resetSwipe = () => {
        swipeStartRef.current = null;
        swipeLockedRef.current = false;
        swipeCancelledRef.current = false;
    };

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

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
        if (isDesktop || event.touches.length !== 1) {
            resetSwipe();
            return;
        }

        if (!resolveMainSwipeRoute(location.pathname)) {
            resetSwipe();
            return;
        }

        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            resetSwipe();
            return;
        }

        if (
            isEditableTarget(target) ||
            hasHorizontalScrollParent(target, swipeContainerRef.current)
        ) {
            resetSwipe();
            return;
        }

        const touch = event.touches[0];
        swipeStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
        };
        swipeLockedRef.current = false;
        swipeCancelledRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
        if (
            isDesktop ||
            swipeCancelledRef.current ||
            event.touches.length !== 1
        ) {
            return;
        }

        const start = swipeStartRef.current;
        if (!start) {
            return;
        }

        const touch = event.touches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (!swipeLockedRef.current) {
            if (absX < SWIPE_LOCK_DISTANCE && absY < SWIPE_LOCK_DISTANCE) {
                return;
            }

            if (absX <= absY * SWIPE_DIRECTION_RATIO) {
                swipeCancelledRef.current = true;
                return;
            }

            swipeLockedRef.current = true;
        }
    };

    const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
        const currentRoute = resolveMainSwipeRoute(location.pathname);
        const start = swipeStartRef.current;

        if (
            isDesktop ||
            !currentRoute ||
            !start ||
            swipeCancelledRef.current ||
            !swipeLockedRef.current
        ) {
            resetSwipe();
            return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const currentIndex = MAIN_SWIPE_ROUTES.indexOf(currentRoute);
        const nextIndex = deltaX < 0 ? currentIndex - 1 : currentIndex + 1;
        const nextRoute = MAIN_SWIPE_ROUTES[nextIndex];

        resetSwipe();

        if (
            !nextRoute ||
            absX < SWIPE_TRIGGER_DISTANCE ||
            absX <= absY * SWIPE_DIRECTION_RATIO
        ) {
            return;
        }

        navigate(nextRoute);
    };

    return (
        <ThemeProvider>
            <TooltipProvider>
                <CustomCSS />
                <div
                    ref={swipeContainerRef}
                    className={cn(
                        "main-layout-content w-full h-full min-h-0 box-border",
                        isLogin && "sm:pl-18",
                    )}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={resetSwipe}
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
