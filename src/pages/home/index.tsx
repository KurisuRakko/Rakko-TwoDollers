import dayjs from "dayjs";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { StorageAPI } from "@/api/storage";
import CloudLoopIcon from "@/assets/icons/cloud-loop.svg?react";
import AnimatedNumber from "@/components/animated-number";
import { showBookGuide } from "@/components/book/util";
import { AnimatePresence, motion } from "motion/react";
import BudgetCard from "@/components/budget/card";
import { HintTooltip } from "@/components/hint";
import { PaginationIndicator } from "@/components/indicator";
import Ledger from "@/components/ledger";
import Loading from "@/components/loading";
import { Promotion } from "@/components/promotion";
import { useBudget } from "@/hooks/use-budget";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSnap } from "@/hooks/use-snap";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { filterOrderedBillListByTimeRange } from "@/utils/filter";
import { denseDate } from "@/utils/time";

let ledgerAnimationShows = false;

// Spring configuration for iOS-like feel
const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1,
};

export default function Page() {
    const t = useIntl();

    const { bills, loading, sync } = useLedgerStore();
    const currentBook = useBookStore(
        useShallow((state) => {
            const { currentBookId, books } = state;
            return books.find((b) => b.id === currentBookId);
        }),
    );
    const showAssets = usePreferenceStore(
        useShallow((state) => state.showAssetsInLedger),
    );
    const { id: userId } = useUserStore();
    const syncIconClassName =
        sync === "wait"
            ? "icon-[mdi--cloud-minus-outline]"
            : sync === "syncing"
              ? "icon-[line-md--cloud-alt-print-loop]"
              : sync === "success"
                ? "icon-[mdi--cloud-check-outline]"
                : "icon-[mdi--cloud-remove-outline] text-red-600";

    const [currentDate, setCurrentDate] = useState(dayjs());
    const ledgerRef = useRef<any>(null);
    const previousSyncRef = useRef(sync);
    const [showSyncSuccess, setShowSyncSuccess] = useState(false);
    const [syncPillMounted, setSyncPillMounted] = useState(false);
    const [syncPillLeaving, setSyncPillLeaving] = useState(false);
    const isDesktop = useIsDesktop();
    const [isExpanded, setIsExpanded] = useState(false);

    const syncStateLabel =
        sync === "wait"
            ? t("home-sync-wait")
            : sync === "syncing"
              ? t("syncing")
              : sync === "success"
                ? t("sync-success")
                : t("home-sync-failed");

    const currentDateBills = useMemo(() => {
        const today = filterOrderedBillListByTimeRange(bills, [
            currentDate.startOf("day"),
            currentDate.endOf("day"),
        ]);
        return today;
    }, [bills, currentDate]);

    const currentDateAmount = useMemo(() => {
        return amountToNumber(
            currentDateBills.reduce((p, c) => {
                return p + c.amount * (c.type === "income" ? 1 : -1);
            }, 0),
        );
    }, [currentDateBills]);

    const { budgets: allBudgets } = useBudget();
    const budgets = allBudgets.filter((b) => {
        return b.joiners.includes(userId) && b.start < Date.now();
    });

    const budgetContainer = useRef<HTMLDivElement>(null);
    const { count: budgetCount, index: curBudgetIndex } = useSnap(
        budgetContainer,
        0,
    );

    const allLoaded = useRef(false);
    // 有预算时需要加载全部bills
    useLayoutEffect(() => {
        if (!allLoaded.current && budgets.length > 0) {
            useLedgerStore.getState().refreshBillList();
            allLoaded.current = true;
        }
    }, [budgets.length]);

    // 滚动时需要加载全部bills
    const onDateClick = useCallback(
        (date: dayjs.Dayjs) => {
            setCurrentDate(date);
            const index = bills.findIndex((bill) => {
                const billDate = dayjs.unix(bill.time / 1000);
                return billDate.isSame(date, "day");
            });
            if (index >= 0) {
                ledgerRef.current?.scrollToIndex(index);
            }
        },
        [bills],
    );

    const onItemShow = useCallback((index: number) => {
        if (!allLoaded.current && index >= 120) {
            useLedgerStore.getState().refreshBillList();
            allLoaded.current = true;
        }
    }, []);

    const onScroll = useCallback(
        (scrollTop: number) => {
            if (isDesktop) return;
            // 只要往上滑就进入全屏
            if (!isExpanded && scrollTop > 10) {
                setIsExpanded(true);
            }
        },
        [isExpanded, isDesktop],
    );

    // 检测在顶部滑下的逻辑
    const touchStartY = useRef<number>(-1);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isExpanded || isDesktop) return;
        const container = ledgerRef.current?.getContainer();
        // 只有在滚动到顶端时才记录初始点
        if (container && container.scrollTop <= 0) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = -1;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isExpanded || isDesktop || touchStartY.current === -1) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY.current;
        // 如果在顶端且向下滑动超过一定距离，则收起
        if (deltaY > 50) {
            setIsExpanded(false);
            touchStartY.current = -1;
        }
    };

    useEffect(() => {
        if (isDesktop && isExpanded) {
            setIsExpanded(false);
        }
    }, [isDesktop, isExpanded]);

    const presence = useMemo(() => {
        if (ledgerAnimationShows) {
            return false;
        }
        return true;
    }, []);

    // safari capable
    useEffect(() => {
        ledgerAnimationShows = true;
    }, []);

    useEffect(() => {
        const previousSync = previousSyncRef.current;
        previousSyncRef.current = sync;

        if (sync === "syncing" || sync === "wait") {
            setShowSyncSuccess(false);
            return;
        }

        if (sync === "success" && previousSync === "syncing") {
            setShowSyncSuccess(true);
            const timer = window.setTimeout(() => {
                setShowSyncSuccess(false);
            }, 2200);
            return () => {
                window.clearTimeout(timer);
            };
        }

        if (sync !== "success") {
            setShowSyncSuccess(false);
        }
    }, [sync]);

    const showSyncPill =
        sync === "syncing" ||
        (sync !== "wait" && sync !== "success") ||
        showSyncSuccess;

    useEffect(() => {
        if (showSyncPill) {
            setSyncPillMounted(true);
            setSyncPillLeaving(false);
            return;
        }

        setSyncPillLeaving(true);
        const timer = window.setTimeout(() => {
            setSyncPillMounted(false);
            setSyncPillLeaving(false);
        }, 220);
        return () => {
            window.clearTimeout(timer);
        };
    }, [showSyncPill]);

    return (
        <div
            className={cn(
                "home-page w-full h-full p-2 flex flex-col overflow-hidden page-show",
                isExpanded && "p-0 gap-0",
            )}
        >
            <AnimatePresence initial={false}>
                {!isExpanded && (
                    <motion.div
                        key="top-collapsible-section"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{
                            opacity: 1,
                            height: "auto",
                            marginBottom: 14,
                            transition: springTransition,
                        }}
                        exit={{
                            opacity: 0,
                            height: 0,
                            marginBottom: 0,
                            transition: {
                                ...springTransition,
                                opacity: { duration: 0.2 },
                            },
                        }}
                        className="overflow-hidden flex-shrink-0 flex flex-col gap-[14px]"
                    >
                        {/* Summary Section */}
                        <div className="home-hero-grid">
                            <div className="home-summary-card home-hero-panel relative overflow-hidden rounded-[28px] p-5 text-foreground">
                                <div className="home-hero-orb home-hero-orb-primary"></div>
                                <div className="home-hero-orb home-hero-orb-secondary"></div>
                                <div className="relative z-[1] flex h-full flex-col gap-5">
                                    <div className="home-hero-head flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-2">
                                            <span className="home-kicker">
                                                {denseDate(currentDate)}
                                            </span>
                                            <div className="home-title-line">
                                                {t("sum")}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="home-book-chip"
                                            onClick={() => {
                                                showBookGuide();
                                            }}
                                        >
                                            <i className="icon-[mdi--book-open-variant-outline]"></i>
                                            {currentBook?.name ??
                                                t("ledger-books")}
                                        </button>
                                    </div>
                                    <div className="home-hero-main flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                        <div className="home-hero-value-stack flex flex-col gap-3">
                                            <AnimatedNumber
                                                value={currentDateAmount}
                                                className="home-hero-amount font-bold"
                                            />
                                            {syncPillMounted && (
                                                <div
                                                    className={cn(
                                                        "home-sync-pill",
                                                        syncPillLeaving &&
                                                            "home-sync-pill-leaving",
                                                    )}
                                                >
                                                    <i
                                                        className={cn(
                                                            syncIconClassName,
                                                            "size-[18px]",
                                                        )}
                                                    ></i>
                                                    {syncStateLabel}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Promotion Section */}
                        <Promotion />

                        {/* Budget Section */}
                        {budgets.length > 0 && (
                            <div className="home-budget-shell">
                                <div className="home-section-head">
                                    <div className="home-section-title">
                                        {t("home-budget-title")}
                                    </div>
                                    {budgetCount > 1 && (
                                        <PaginationIndicator
                                            count={budgetCount}
                                            current={curBudgetIndex}
                                        />
                                    )}
                                </div>
                                <div
                                    ref={budgetContainer}
                                    className="w-full flex overflow-x-auto gap-3 scrollbar-hidden snap-mandatory snap-x"
                                >
                                    {budgets.map((budget) => {
                                        return (
                                            <BudgetCard
                                                className="home-budget-card flex-shrink-0 snap-start"
                                                key={budget.id}
                                                budget={budget}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                layout
                transition={springTransition}
                className={cn(
                    "home-ledger-stage flex-1 flex flex-col min-height-0 overflow-hidden",
                    isExpanded && "rounded-none !p-0 !gap-0",
                )}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                <div
                    className={cn(
                        "home-toolbar",
                        isExpanded && "rounded-none border-x-0 border-t-0 bg-background/95 sticky top-0 z-[20]",
                    )}
                >
                    <div className="home-toolbar-copy">
                        <div className="home-toolbar-subtitle">
                            {t("home-today-records")}: {currentDateBills.length}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <HintTooltip
                            persistKey={"cloudSyncHintShows"}
                            content={
                                "等待云同步完成后，其他设备即可获取最新的账单数据"
                            }
                        >
                            <button
                                type="button"
                                className="home-toolbar-button"
                                onClick={() => {
                                    useLedgerStore.getState().initCurrentBook();
                                    StorageAPI.toSync();
                                }}
                            >
                                {loading ? (
                                    <Loading className="[&_i]:size-[18px]" />
                                ) : sync === "syncing" ? (
                                    <CloudLoopIcon width={18} height={18} />
                                ) : (
                                    <i
                                        className={cn(
                                            syncIconClassName,
                                            "size-[18px]",
                                        )}
                                    ></i>
                                )}
                            </button>
                        </HintTooltip>
                        {isExpanded && !isDesktop && (
                            <button
                                type="button"
                                className="home-toolbar-button bg-red-500/10 text-red-500 border-red-500/20"
                                onClick={() => setIsExpanded(false)}
                            >
                                <i className="icon-[mdi--close] size-[18px]"></i>
                            </button>
                        )}
                    </div>
                </div>
                <div
                    className={cn(
                        "home-ledger-shell flex-1 translate-0 overflow-hidden",
                        isExpanded && "rounded-none !p-0 border-none",
                    )}
                >
                    <div className="w-full h-full">
                        {bills.length > 0 ? (
                            <Ledger
                                ref={ledgerRef}
                                bills={bills}
                                className={cn(
                                    bills.length > 0 &&
                                        "relative home-ledger-list",
                                )}
                                enableDivideAsOrdered
                                showTime
                                onItemShow={onItemShow}
                                onVisibleDateChange={setCurrentDate}
                                onDateClick={onDateClick}
                                onScroll={onScroll}
                                presence={presence}
                                showAssets={showAssets}
                            />
                        ) : (
                            <div className="home-empty-state text-xs p-4 text-center">
                                {t("nothing-here-add-one-bill")}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
