import dayjs from "dayjs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import BudgetCard from "@/components/budget/card";
import { HintTooltip } from "@/components/hint";
import { PaginationIndicator } from "@/components/indicator";
import Ledger from "@/components/ledger";
import Loading from "@/components/loading";
import Navigation from "@/components/navigation";
import { showUserCenter } from "@/components/settings/user-center";
import {
    hideHomeStartupOverlay,
    showHomeStartupOverlay,
} from "@/components/startup-overlay/controller";
import UserAvatarImage from "@/components/user-avatar";
import { useBudget } from "@/hooks/use-budget";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useSnap } from "@/hooks/use-snap";
import { useCurrentUserDisplay } from "@/hooks/use-user-display";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { useIsLogin, useUserStore } from "@/store/user";
import { cn } from "@/utils";
import { filterOrderedBillListByTimeRange } from "@/utils/filter";
import { denseDate } from "@/utils/time";

let ledgerAnimationShows = false;
const HOME_AVATAR_LAYOUT_ID = "home-current-user-avatar";
const shownStartupBooks = new Set<string>();
const STARTUP_OVERLAY_MIN_VISIBLE_MS = 320;
const STARTUP_OVERLAY_BUSY_GRACE_MS = 640;

// Spring configuration for iOS-like feel
const springTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 1,
};

const avatarSharedTransition = {
    type: "spring" as const,
    stiffness: 180,
    damping: 28,
    mass: 1.15,
};

function HomeAvatarButton({
    avatarSource,
    displayName,
    title,
    layoutId,
    className,
    onClick,
}: {
    avatarSource: string;
    displayName: string;
    title: string;
    layoutId?: string;
    className?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={cn("home-avatar-button", className)}
            data-startup-avatar-target={layoutId}
            onClick={onClick}
            title={title}
            aria-label={title}
        >
            <motion.div
                layoutId={layoutId}
                transition={avatarSharedTransition}
                className="home-avatar-visual"
            >
                <UserAvatarImage
                    source={avatarSource}
                    alt={displayName}
                    className="home-avatar-image"
                />
            </motion.div>
        </button>
    );
}

export default function Page() {
    const t = useIntl();

    const { bills, loading: ledgerLoading, sync } = useLedgerStore();
    const {
        currentBookId,
        books,
        loading: bookLoading,
    } = useBookStore(
        useShallow((state) => ({
            currentBookId: state.currentBookId,
            books: state.books,
            loading: state.loading,
        })),
    );
    const currentBook = useMemo(() => {
        return books.find((book) => book.id === currentBookId);
    }, [books, currentBookId]);
    const showAssets = usePreferenceStore(
        useShallow((state) => state.showAssetsInLedger),
    );
    const { id: userId } = useUserStore();
    const isLogin = useIsLogin();
    const { avatarSource, displayName } = useCurrentUserDisplay();
    const prefersReducedMotion = Boolean(useReducedMotion());
    const avatarLayoutId = prefersReducedMotion
        ? undefined
        : HOME_AVATAR_LAYOUT_ID;
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
    const [startupBookId, setStartupBookId] = useState<string | null>(null);
    const [startupExiting, setStartupExiting] = useState(false);
    const [startupShownAt, setStartupShownAt] = useState<number | null>(null);
    const [startupObservedInitializing, setStartupObservedInitializing] =
        useState(false);
    const [startupTimingTick, setStartupTimingTick] = useState(0);
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

    const touchStartY = useRef<number>(-1);
    const handleTouchStart = (e: React.TouchEvent) => {
        if (isDesktop) return;
        const container = ledgerRef.current?.getContainer();
        const isAtTop = !container || container.scrollTop <= 0;

        if (!isExpanded || isAtTop) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = -1;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDesktop || touchStartY.current === -1) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY.current;

        if (isExpanded) {
            // 在全屏状态，只有在顶端且向下滑动超过一定距离才收起
            if (deltaY > 50) {
                setIsExpanded(false);
                touchStartY.current = -1;
            }
        } else {
            // 在收起状态，只要向上滑动超过一定距离就展开
            if (deltaY < -40) {
                setIsExpanded(true);
                touchStartY.current = -1;
            }
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

    const isCurrentBookInitializing =
        Boolean(currentBookId) && (bookLoading || ledgerLoading);
    const shouldBookPickerTakeOver = isLogin && currentBookId === undefined;
    const startupStatusLabel =
        !isCurrentBookInitializing && (sync === "wait" || sync === "syncing")
            ? t("home-startup-syncing")
            : t("home-startup-loading");

    useEffect(() => {
        if (!isLogin || !currentBookId) {
            setStartupBookId(null);
            setStartupExiting(false);
            setStartupShownAt(null);
            setStartupObservedInitializing(false);
            setStartupTimingTick(0);
            return;
        }

        if (
            shownStartupBooks.has(currentBookId) ||
            startupBookId === currentBookId ||
            startupExiting
        ) {
            return;
        }

        setStartupBookId(currentBookId);
        setStartupExiting(false);
        setStartupShownAt(Date.now());
        setStartupObservedInitializing(isCurrentBookInitializing);
        setStartupTimingTick(0);
    }, [
        currentBookId,
        isCurrentBookInitializing,
        isLogin,
        startupBookId,
        startupExiting,
    ]);

    useEffect(() => {
        if (!startupBookId || !isCurrentBookInitializing) {
            return;
        }

        setStartupObservedInitializing(true);
    }, [isCurrentBookInitializing, startupBookId]);

    useEffect(() => {
        if (!startupBookId) {
            return;
        }

        void startupTimingTick;

        if (!currentBookId || currentBookId !== startupBookId) {
            setStartupBookId(null);
            setStartupExiting(false);
            setStartupShownAt(null);
            setStartupObservedInitializing(false);
            setStartupTimingTick(0);
            return;
        }

        if (startupExiting) {
            return;
        }

        const shownFor = startupShownAt ? Date.now() - startupShownAt : 0;
        const needsMinimumVisibility =
            shownFor < STARTUP_OVERLAY_MIN_VISIBLE_MS;
        const shouldKeepWaitingForInitialization =
            !startupObservedInitializing &&
            shownFor < STARTUP_OVERLAY_BUSY_GRACE_MS;

        if (isCurrentBookInitializing) {
            return;
        }

        if (needsMinimumVisibility || shouldKeepWaitingForInitialization) {
            const nextCheckIn = Math.max(
                STARTUP_OVERLAY_MIN_VISIBLE_MS - shownFor,
                STARTUP_OVERLAY_BUSY_GRACE_MS - shownFor,
                16,
            );
            const timer = window.setTimeout(() => {
                setStartupTimingTick((tick) => tick + 1);
            }, nextCheckIn);

            return () => {
                window.clearTimeout(timer);
            };
        }

        shownStartupBooks.add(startupBookId);
        setStartupExiting(true);
        setStartupShownAt(null);
        setStartupObservedInitializing(false);
        setStartupTimingTick(0);
    }, [
        currentBookId,
        isCurrentBookInitializing,
        startupObservedInitializing,
        startupBookId,
        startupExiting,
        startupShownAt,
        startupTimingTick,
    ]);

    const showStartupOverlay =
        Boolean(startupBookId) &&
        currentBookId === startupBookId &&
        !startupExiting &&
        !shouldBookPickerTakeOver;

    useEffect(() => {
        if (!showStartupOverlay) {
            hideHomeStartupOverlay();
            return;
        }

        showHomeStartupOverlay({
            avatarSource,
            displayName,
            layoutId: avatarLayoutId,
            status: startupStatusLabel,
        });
    }, [
        avatarLayoutId,
        avatarSource,
        displayName,
        showStartupOverlay,
        startupStatusLabel,
    ]);

    useEffect(() => {
        if (!startupExiting) {
            return;
        }

        const timer = window.setTimeout(() => {
            setStartupBookId(null);
            setStartupExiting(false);
        }, 240);

        return () => {
            window.clearTimeout(timer);
        };
    }, [startupExiting]);

    return (
        <div
            className={cn(
                "home-page relative w-full h-full px-2 pt-2 pb-0 flex flex-col overflow-hidden page-show",
                isExpanded && "p-0 gap-0",
            )}
        >
            <Navigation hidden={isExpanded} />
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
                        <div
                            className="home-hero-grid flex-shrink-0"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                        >
                            <div className="home-summary-card home-hero-panel relative overflow-hidden rounded-[24px] p-4 text-foreground">
                                <div className="home-hero-orb home-hero-orb-primary"></div>
                                <div className="home-hero-orb home-hero-orb-secondary"></div>
                                <div className="relative z-[1] flex h-full flex-col justify-between">
                                    <div className="home-hero-head flex items-start justify-between gap-1">
                                        <div className="flex flex-col gap-1">
                                            <span className="home-kicker">
                                                {denseDate(currentDate)}
                                            </span>
                                            <div className="home-title-line">
                                                {t("sum")}
                                            </div>
                                        </div>
                                        <div className="home-summary-actions">
                                            <button
                                                type="button"
                                                className="home-book-chip"
                                                onClick={() => {
                                                    if (
                                                        StorageAPI.type ===
                                                        "github"
                                                    ) {
                                                        showBookGuide();
                                                    } else {
                                                        useUserStore
                                                            .getState()
                                                            .setForceLoginUI(
                                                                true,
                                                            );
                                                    }
                                                }}
                                            >
                                                <i
                                                    className={cn(
                                                        StorageAPI.type ===
                                                            "github"
                                                            ? "icon-[mdi--book-open-variant-outline]"
                                                            : "icon-[mdi--account-outline]",
                                                    )}
                                                ></i>
                                                {StorageAPI.type === "github"
                                                    ? (currentBook?.name ??
                                                      t("ledger-books"))
                                                    : t("login-action")}
                                            </button>
                                            {isLogin && (
                                                <HomeAvatarButton
                                                    avatarSource={avatarSource}
                                                    displayName={displayName}
                                                    title={t("user-center")}
                                                    layoutId={avatarLayoutId}
                                                    className="home-avatar-button-hero"
                                                    onClick={() => {
                                                        showUserCenter();
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div className="home-hero-main flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                                        <div className="home-hero-value-stack flex flex-col gap-1">
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
                        isExpanded &&
                            "rounded-none border-x-0 border-t-0 bg-background/95 sticky top-0 z-[20]",
                    )}
                >
                    <div className="home-toolbar-copy">
                        <div className="home-toolbar-subtitle">
                            {t("home-today-records")}: {currentDateBills.length}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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
                                {ledgerLoading ? (
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
                        {isExpanded && !isDesktop && isLogin && (
                            <HomeAvatarButton
                                avatarSource={avatarSource}
                                displayName={displayName}
                                title={t("user-center")}
                                layoutId={avatarLayoutId}
                                className="home-toolbar-avatar-button"
                                onClick={() => {
                                    showUserCenter();
                                }}
                            />
                        )}
                        {isExpanded && !isDesktop && (
                            <button
                                type="button"
                                className="home-toolbar-button"
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
