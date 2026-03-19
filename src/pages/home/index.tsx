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
import {
    getStageProps,
    panelSpringTransition,
    reducedSectionEnterVariants,
    reducedStateSurfaceVariants,
    sectionEnterVariants,
    sharedElementTransition,
    staggerChildren,
    stateSurfaceVariants,
    surfaceTransition,
} from "@/utils/motion";
import { getStoredSyncEndpointType } from "@/utils/storage-runtime";
import { denseDate } from "@/utils/time";

let ledgerAnimationShows = false;
const HOME_AVATAR_LAYOUT_ID = "home-current-user-avatar";
const shownStartupBooks = new Set<string>();
const STARTUP_OVERLAY_MIN_VISIBLE_MS = 320;
const STARTUP_OVERLAY_BUSY_GRACE_MS = 640;
const MANUAL_SYNC_MIN_VISIBLE_MS = 300;
const MANUAL_SYNC_EXIT_MS = 560;
const PULL_SYNC_THRESHOLD = 86;
const PULL_SYNC_MAX = 124;

type PullSyncState = "idle" | "pulling" | "armed" | "syncing" | "settling";

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
                transition={sharedElementTransition}
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
    const storageType = getStoredSyncEndpointType();
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
    const [startupBookId, setStartupBookId] = useState<string | null>(null);
    const [startupExiting, setStartupExiting] = useState(false);
    const [startupShownAt, setStartupShownAt] = useState<number | null>(null);
    const [startupObservedInitializing, setStartupObservedInitializing] =
        useState(false);
    const [startupTimingTick, setStartupTimingTick] = useState(0);
    const isDesktop = useIsDesktop();
    const [isExpanded, setIsExpanded] = useState(false);
    const [pullSyncState, setPullSyncState] = useState<PullSyncState>("idle");
    const [pullDistance, setPullDistance] = useState(0);
    const [manualSyncOverlayVisible, setManualSyncOverlayVisible] =
        useState(false);
    const [manualSyncExiting, setManualSyncExiting] = useState(false);
    const [manualSyncStatus, setManualSyncStatus] = useState("");
    const collapseTouchStartY = useRef<number>(-1);
    const pullTouchStartY = useRef<number | null>(null);
    const settlePullTimerRef = useRef<number | null>(null);

    const syncStateLabel =
        sync === "wait"
            ? t("home-sync-wait")
            : sync === "syncing"
              ? t("syncing")
              : sync === "success"
                ? t("sync-success")
                : t("home-sync-failed");
    const pullIndicatorLabel =
        pullSyncState === "armed"
            ? t("home-pull-release")
            : pullSyncState === "syncing"
              ? t("home-pull-syncing")
              : t("home-pull-to-sync");
    const pullIndicatorIconClassName =
        pullSyncState === "armed"
            ? "icon-[mdi--cloud-sync-outline]"
            : pullSyncState === "syncing"
              ? "icon-[mdi--loading] animate-spin"
              : "icon-[mdi--arrow-down-circle-outline]";
    const pullIndicatorVisible =
        !manualSyncOverlayVisible &&
        !manualSyncExiting &&
        !isExpanded &&
        (pullSyncState !== "idle" || pullDistance > 0);
    const pullIndicatorProgress = Math.min(
        1,
        pullDistance / PULL_SYNC_THRESHOLD,
    );
    const stagedContentVariants = prefersReducedMotion
        ? {
              initial: {},
              animate: {
                  transition: staggerChildren({
                      delayChildren: 0,
                      staggerStep: 0,
                  }),
              },
          }
        : {
              initial: {},
              animate: {
                  transition: staggerChildren({
                      delayChildren: 0.04,
                      staggerStep: 0.05,
                  }),
              },
          };
    const stagedItemVariants = prefersReducedMotion
        ? reducedSectionEnterVariants
        : sectionEnterVariants;
    const ledgerStateVariants = prefersReducedMotion
        ? reducedStateSurfaceVariants
        : stateSurfaceVariants;
    const ledgerStateTransition = prefersReducedMotion
        ? { duration: 0.16 }
        : surfaceTransition;

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

    const clearPullSyncSettleTimer = useCallback(() => {
        if (settlePullTimerRef.current) {
            window.clearTimeout(settlePullTimerRef.current);
            settlePullTimerRef.current = null;
        }
    }, []);

    const settlePullSync = useCallback(
        (nextState: PullSyncState = "idle") => {
            clearPullSyncSettleTimer();
            setPullDistance(0);
            if (nextState === "idle") {
                setPullSyncState("idle");
                return;
            }
            setPullSyncState(nextState);
            settlePullTimerRef.current = window.setTimeout(() => {
                setPullSyncState("idle");
                settlePullTimerRef.current = null;
            }, 220);
        },
        [clearPullSyncSettleTimer],
    );

    const getLedgerContainer = useCallback(() => {
        return ledgerRef.current?.getContainer() as HTMLDivElement | null;
    }, []);

    const canPullSync = useCallback(() => {
        if (
            isDesktop ||
            isExpanded ||
            manualSyncOverlayVisible ||
            manualSyncExiting
        ) {
            return false;
        }

        const container = getLedgerContainer();
        return !container || container.scrollTop <= 0;
    }, [
        getLedgerContainer,
        isDesktop,
        isExpanded,
        manualSyncExiting,
        manualSyncOverlayVisible,
    ]);

    const triggerManualSync = useCallback(async () => {
        if (manualSyncOverlayVisible || manualSyncExiting) {
            return;
        }

        clearPullSyncSettleTimer();
        setPullDistance(0);
        setPullSyncState("syncing");
        setManualSyncExiting(false);
        setManualSyncStatus(t("syncing"));
        setManualSyncOverlayVisible(true);

        const startedAt = Date.now();
        try {
            await useLedgerStore.getState().syncCurrentBook();
            const remaining = Math.max(
                0,
                MANUAL_SYNC_MIN_VISIBLE_MS - (Date.now() - startedAt),
            );
            if (remaining > 0) {
                await new Promise((resolve) =>
                    window.setTimeout(resolve, remaining),
                );
            }
        } catch (error) {
            setManualSyncStatus(t("home-sync-failed"));
            await new Promise((resolve) => window.setTimeout(resolve, 180));
            console.error("manual sync failed", error);
        } finally {
            setManualSyncOverlayVisible(false);
            setManualSyncExiting(true);
        }
    }, [
        clearPullSyncSettleTimer,
        manualSyncExiting,
        manualSyncOverlayVisible,
        t,
    ]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isDesktop) return;
        const container = getLedgerContainer();
        const isAtTop = !container || container.scrollTop <= 0;

        if (!isExpanded || isAtTop) {
            collapseTouchStartY.current = e.touches[0].clientY;
        } else {
            collapseTouchStartY.current = -1;
        }

        if (canPullSync()) {
            pullTouchStartY.current = e.touches[0].clientY;
            clearPullSyncSettleTimer();
        } else {
            pullTouchStartY.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDesktop) return;

        const currentY = e.touches[0].clientY;
        if (
            pullTouchStartY.current !== null &&
            pullSyncState !== "syncing" &&
            canPullSync()
        ) {
            const pullDeltaY = currentY - pullTouchStartY.current;
            if (pullDeltaY > 0) {
                const resistedDistance = Math.min(
                    PULL_SYNC_MAX,
                    pullDeltaY * 0.58,
                );
                setPullDistance(resistedDistance);
                setPullSyncState(
                    resistedDistance >= PULL_SYNC_THRESHOLD
                        ? "armed"
                        : "pulling",
                );
                return;
            }
        }

        if (collapseTouchStartY.current === -1) return;
        const deltaY = currentY - collapseTouchStartY.current;

        if (isExpanded) {
            // 在全屏状态，只有在顶端且向下滑动超过一定距离才收起
            if (deltaY > 50) {
                setIsExpanded(false);
                collapseTouchStartY.current = -1;
            }
        } else {
            // 在收起状态，只要向上滑动超过一定距离就展开
            if (deltaY < -40) {
                setIsExpanded(true);
                collapseTouchStartY.current = -1;
            }
        }
    };

    const handleTouchEnd = useCallback(() => {
        collapseTouchStartY.current = -1;

        if (pullTouchStartY.current === null) {
            return;
        }

        pullTouchStartY.current = null;
        if (pullSyncState === "armed") {
            void triggerManualSync();
            return;
        }

        if (pullDistance > 0 || pullSyncState === "pulling") {
            settlePullSync("settling");
        }
    }, [pullDistance, pullSyncState, settlePullSync, triggerManualSync]);

    const handleTouchCancel = useCallback(() => {
        collapseTouchStartY.current = -1;
        pullTouchStartY.current = null;
        if (pullDistance > 0 || pullSyncState !== "idle") {
            settlePullSync("settling");
        }
    }, [pullDistance, pullSyncState, settlePullSync]);

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
        if (manualSyncOverlayVisible) {
            showHomeStartupOverlay({
                avatarSource,
                displayName,
                layoutId: avatarLayoutId,
                minVisibleMs: MANUAL_SYNC_MIN_VISIBLE_MS,
                mode: "manual-sync",
                status: manualSyncStatus,
            });
            return;
        }

        if (manualSyncExiting) {
            hideHomeStartupOverlay();
            return;
        }

        if (!showStartupOverlay) {
            hideHomeStartupOverlay();
            return;
        }

        showHomeStartupOverlay({
            avatarSource,
            displayName,
            layoutId: avatarLayoutId,
            mode: "startup",
            status: startupStatusLabel,
        });
    }, [
        avatarLayoutId,
        avatarSource,
        displayName,
        manualSyncExiting,
        manualSyncOverlayVisible,
        manualSyncStatus,
        showStartupOverlay,
        startupStatusLabel,
    ]);

    useEffect(() => {
        if (!manualSyncExiting) {
            return;
        }

        const timer = window.setTimeout(() => {
            setManualSyncExiting(false);
            settlePullSync("settling");
        }, MANUAL_SYNC_EXIT_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [manualSyncExiting, settlePullSync]);

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

    useEffect(() => {
        return () => {
            clearPullSyncSettleTimer();
        };
    }, [clearPullSyncSettleTimer]);

    return (
        <div
            className={cn(
                "home-page relative w-full h-full px-2 pt-2 pb-0 flex flex-col overflow-hidden",
                isExpanded && "p-0 gap-0",
            )}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
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
                            transition: panelSpringTransition,
                        }}
                        exit={{
                            opacity: 0,
                            height: 0,
                            marginBottom: 0,
                            transition: {
                                ...panelSpringTransition,
                                opacity: { duration: 0.2 },
                            },
                        }}
                        className="overflow-hidden flex-shrink-0 flex flex-col gap-[14px]"
                    >
                        <div
                            className="home-hero-grid flex-shrink-0"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchCancel}
                        >
                            <motion.div
                                {...getStageProps({
                                    index: 0,
                                    reducedMotion: prefersReducedMotion,
                                    y: 20,
                                })}
                                className="home-summary-card home-hero-panel relative overflow-hidden rounded-[24px] p-4 text-foreground"
                            >
                                <div className="home-hero-orb home-hero-orb-primary"></div>
                                <div className="home-hero-orb home-hero-orb-secondary"></div>
                                <motion.div
                                    className="relative z-[1] flex h-full flex-col justify-between"
                                    variants={stagedContentVariants}
                                    initial="initial"
                                    animate="animate"
                                >
                                    <motion.div
                                        variants={stagedItemVariants}
                                        className="home-hero-head flex items-start justify-between gap-1"
                                    >
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
                                                        storageType === "github"
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
                                                        storageType === "github"
                                                            ? "icon-[mdi--book-open-variant-outline]"
                                                            : "icon-[mdi--account-outline]",
                                                    )}
                                                ></i>
                                                {storageType === "github"
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
                                    </motion.div>
                                    <motion.div
                                        variants={stagedItemVariants}
                                        className="home-hero-main flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
                                    >
                                        <motion.div
                                            variants={stagedItemVariants}
                                            className="home-hero-value-stack flex flex-col gap-1"
                                        >
                                            <AnimatedNumber
                                                value={currentDateAmount}
                                                className="home-hero-amount font-bold"
                                            />
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Budget Section */}
                        {budgets.length > 0 && (
                            <motion.div
                                {...getStageProps({
                                    index: 1,
                                    reducedMotion: prefersReducedMotion,
                                })}
                                className="home-budget-shell"
                            >
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
                                    {budgets.map((budget, index) => {
                                        return (
                                            <motion.div
                                                key={budget.id}
                                                animate={
                                                    prefersReducedMotion
                                                        ? undefined
                                                        : index ===
                                                            curBudgetIndex
                                                          ? {
                                                                opacity: 1,
                                                                scale: 1,
                                                                y: 0,
                                                            }
                                                          : {
                                                                opacity: 0.86,
                                                                scale: 0.986,
                                                                y: 2,
                                                            }
                                                }
                                                transition={surfaceTransition}
                                                className="flex-shrink-0 snap-start"
                                            >
                                                <BudgetCard
                                                    className="home-budget-card"
                                                    budget={budget}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                className={cn(
                    "home-pull-sync-indicator",
                    pullIndicatorVisible && "home-pull-sync-indicator-visible",
                )}
                style={{
                    transform: `translate3d(0, ${Math.max(
                        0,
                        pullDistance * 0.72,
                    )}px, 0) scale(${0.92 + pullIndicatorProgress * 0.08})`,
                    opacity: pullIndicatorVisible
                        ? 0.7 + pullIndicatorProgress * 0.3
                        : 0,
                }}
            >
                <div className="home-pull-sync-badge">
                    <i className={cn(pullIndicatorIconClassName, "size-4")}></i>
                    <span>{pullIndicatorLabel}</span>
                </div>
            </div>

            <motion.div
                layout
                transition={panelSpringTransition}
                className={cn(
                    "home-ledger-stage flex-1 flex flex-col min-height-0 overflow-hidden",
                    isExpanded && "rounded-none !p-0 !gap-0",
                )}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            >
                <motion.div
                    layout
                    {...getStageProps({
                        index: isExpanded ? 0 : 2,
                        reducedMotion: prefersReducedMotion,
                        y: 14,
                    })}
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
                        {sync === "failed" && (
                            <div className="home-toolbar-title text-destructive">
                                {syncStateLabel}
                            </div>
                        )}
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
                                title={syncStateLabel}
                                aria-label={syncStateLabel}
                                onClick={() => {
                                    void triggerManualSync();
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
                </motion.div>
                <motion.div
                    {...getStageProps({
                        index: isExpanded ? 0 : 3,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className={cn(
                        "home-ledger-shell flex-1 translate-0 overflow-hidden",
                        isExpanded && "rounded-none !p-0 border-none",
                    )}
                >
                    <div className="w-full h-full">
                        <AnimatePresence mode="wait" initial={false}>
                            {bills.length > 0 ? (
                                <motion.div
                                    key="home-ledger-list"
                                    variants={ledgerStateVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={ledgerStateTransition}
                                    className="h-full"
                                >
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
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="home-ledger-empty"
                                    variants={ledgerStateVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={ledgerStateTransition}
                                    className="home-empty-state text-xs p-4 text-center"
                                >
                                    {t("nothing-here-add-one-bill")}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
