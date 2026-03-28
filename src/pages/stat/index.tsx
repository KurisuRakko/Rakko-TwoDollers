import dayjs from "dayjs";
import {
    AnimatePresence,
    LayoutGroup,
    motion,
    useReducedMotion,
} from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useShallow } from "zustand/shallow";
import { StorageDeferredAPI } from "@/api/storage";
import type { AnalysisResult } from "@/api/storage/analysis";
import {
    BillFilterViewProvider,
    showBillFilterView,
} from "@/components/bill-filter";
import { showBillInfo } from "@/components/bill-info";
import BillItem from "@/components/ledger/item";
import Navigation from "@/components/navigation";
import { showSortableList } from "@/components/sortable";
import { AnalysisCloud } from "@/components/stat/analysic-cloud";
import { AnalysisDetail } from "@/components/stat/analysis-detail";
import { useChartPart } from "@/components/stat/chart-part";
import { DateSliced, useDateSliced } from "@/components/stat/date-slice";
import {
    type FocusType,
    FocusTypeSelector,
    FocusTypes,
} from "@/components/stat/focus-type";
import { StatMetaPill, StatSectionCard } from "@/components/stat/section-card";
import { TagItem } from "@/components/stat/static-item";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";
import {
    DefaultFilterViewId,
    useCustomFilters,
} from "@/hooks/use-custom-filters";
import { useTag } from "@/hooks/use-tag";
import type { BillFilter, BillFilterView } from "@/ledger/extra-type";
import type { Bill } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import {
    getStageProps,
    reducedStateSwapVariants,
    sharedElementTransition,
    stateSwapVariants,
    surfaceTransition,
} from "@/utils/motion";

export default function Page() {
    const t = useIntl();
    const { id } = useParams();
    const prefersReducedMotion = Boolean(useReducedMotion());
    const filterLayoutId = useId();
    const statStateVariants = prefersReducedMotion
        ? reducedStateSwapVariants
        : stateSwapVariants;

    const { bills } = useLedgerStore(
        useShallow((state) => ({
            bills: state.bills,
        })),
    );

    const endTime = useMemo(() => Date.now(), []);
    const startTime = bills[bills.length - 1]?.time ?? dayjs();

    const customFilters = useLedgerStore(
        useShallow((state) => state.infos?.meta.customFilters),
    );

    const allFilterViews = useMemo(() => {
        if (
            customFilters?.some((filter) => filter.id === DefaultFilterViewId)
        ) {
            return customFilters;
        }
        return [
            {
                id: DefaultFilterViewId,
                filter: {},
                name: t("default-filter-name"),
            } as BillFilterView,
            ...(customFilters ?? []),
        ];
    }, [customFilters, t]);

    const [filterViewId, setFilterViewId] = useState(
        id ?? allFilterViews[0].id,
    );

    const selectedFilterView = allFilterViews.find(
        (filter) => filter.id === filterViewId,
    );
    const selectedFilter = selectedFilterView?.filter;

    const fullRange = [
        selectedFilter?.start ?? startTime,
        selectedFilter?.end ?? endTime,
    ] as [number, number];

    const {
        sliceRange,
        viewType,
        props: dateSlicedProps,
        setSliceId,
    } = useDateSliced({
        range: fullRange,
        selectCustomSliceWhenInitial: Boolean(id),
    });

    const realRange = useMemo(
        () => [
            sliceRange?.[0] ?? selectedFilter?.start ?? startTime,
            sliceRange?.[1] ?? selectedFilter?.end ?? endTime,
        ],
        [
            sliceRange,
            selectedFilter?.start,
            selectedFilter?.end,
            startTime,
            endTime,
        ],
    );

    const navigate = useNavigate();
    const seeDetails = (append?: Partial<BillFilter>) => {
        navigate("/search", {
            state: {
                filter: {
                    ...selectedFilter,
                    start: realRange[0],
                    end: realRange[1],
                    ...append,
                },
            },
        });
    };

    const [filtered, setFiltered] = useState<Bill[]>([]);
    const hasFiltered = filtered.length > 0;

    useEffect(() => {
        const book = useBookStore.getState().currentBookId;
        if (!book || !selectedFilter) {
            return;
        }
        StorageDeferredAPI.filter(book, {
            ...selectedFilter,
            start: realRange[0],
            end: realRange[1],
        }).then((result) => {
            setFiltered(result);
        });
    }, [realRange, selectedFilter]);

    const [focusType, setFocusType] = useState<FocusType>("expense");
    const [dimension, setDimension] = useState<"category" | "user">("category");

    const { dataSources, Part, setSelectedCategoryId } = useChartPart({
        viewType,
        seeDetails,
        focusType,
        filtered,
        dimension,
        displayCurrency: selectedFilterView?.displayCurrency,
    });

    const totalMoneys = FocusTypes.map((type) => dataSources.total[type]);

    const { tags } = useTag();
    const tagStructure = useMemo(
        () =>
            Array.from(dataSources.tagStructure.entries())
                .map(([tagId, struct]) => {
                    const tag = tags.find((item) => item.id === tagId);
                    if (!tag) {
                        return undefined;
                    }
                    return {
                        ...tag,
                        ...struct,
                    };
                })
                .filter((value) => value !== undefined),
        [dataSources.tagStructure, tags],
    );

    const { incomes: filteredIncomeBills, expenses: filteredExpenseBills } =
        useMemo(() => {
            const incomes: Bill[] = [];
            const expenses: Bill[] = [];

            filtered.forEach((bill) => {
                if (bill.type === "expense") {
                    expenses.push(bill);
                    return;
                }
                incomes.push(bill);
            });

            return {
                incomes,
                expenses,
            };
        }, [filtered]);

    const [analysis, setAnalysis] = useState<AnalysisResult>();
    const analysisUnit =
        viewType === "yearly"
            ? "year"
            : viewType === "monthly"
              ? "month"
              : viewType === "weekly"
                ? "week"
                : "day";

    useEffect(() => {
        const book = useBookStore.getState().currentBookId;
        if (!book || !realRange[0] || !realRange[1] || !analysisUnit) {
            setAnalysis(undefined);
            return;
        }
        StorageDeferredAPI.analysis(
            book,
            [realRange[0], realRange[1]],
            analysisUnit,
            focusType,
        ).then((value) => {
            setAnalysis(value);
        });
    }, [analysisUnit, focusType, realRange]);

    const { updateFilter, addFilter } = useCustomFilters();
    const toChangeFilter = async () => {
        if (!selectedFilterView) {
            return;
        }
        const action = await showBillFilterView({
            ...selectedFilterView,
        });
        if (action === "delete") {
            await updateFilter(selectedFilterView.id);
            setFilterViewId(allFilterViews[0].id);
            return;
        }
        await updateFilter(selectedFilterView.id, {
            ...action,
            name: action.name ?? selectedFilterView.name,
        });
    };

    const toReOrder = async () => {
        if ((customFilters?.length ?? 0) === 0) {
            return;
        }
        const ordered = await showSortableList(customFilters);
        useLedgerStore.getState().updateGlobalMeta((prev) => {
            prev.customFilters = ordered
                .map((value) =>
                    prev.customFilters?.find(
                        (filter) => filter.id === value.id,
                    ),
                )
                .filter((value) => value !== undefined);
            return prev;
        });
    };

    const toAddFilter = async () => {
        const newFilter = await showBillFilterView({
            name: t("new-filter-name"),
            filter: {},
            hideDelete: true,
        });
        if (newFilter === "delete" || !newFilter.name) {
            return;
        }
        const createdId = await addFilter(newFilter.name, newFilter);
        if (!createdId) {
            return;
        }
        setSliceId(undefined);
        setFilterViewId(createdId);
    };

    const { allCurrencies, baseCurrency } = useCurrency();
    const highestExpenseBill = dataSources.highestExpenseBill;
    const highestIncomeBill = dataSources.highestIncomeBill;
    const selectedSliceLabel = dateSlicedProps.value?.split("|")?.[1];
    const rangeSummary =
        viewType === "custom"
            ? `${dayjs(realRange[0]).format("MM/DD")} - ${dayjs(
                  realRange[1],
              ).format("MM/DD")}`
            : [t(`stat-view-${viewType}`), selectedSliceLabel]
                  .filter(Boolean)
                  .join(" · ");
    const dimensionSummary =
        dimension === "category" ? t("categories") : t("creator");
    const focusSummary = focusType === "balance" ? t("Balance") : t(focusType);
    const currentCount = filtered.length;

    return (
        <div className="stat-page w-full h-full p-2 pb-[calc(100px+env(safe-area-inset-bottom))] flex flex-col items-center justify-start sm:justify-center gap-4 overflow-hidden">
            <Navigation />

            <div className="stat-page-shell relative z-[1] w-full mx-2 max-w-[600px] flex flex-col gap-3">
                <motion.div
                    {...getStageProps({
                        index: 0,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="stat-top-shell w-full flex flex-col gap-4"
                >
                    <div className="stat-context-row">
                        <StatMetaPill strong>
                            {t("filter")} · {selectedFilterView?.name}
                        </StatMetaPill>
                        <StatMetaPill>
                            {t("range")} · {rangeSummary}
                        </StatMetaPill>
                        <StatMetaPill>{dimensionSummary}</StatMetaPill>
                        <StatMetaPill>{focusSummary}</StatMetaPill>
                        <StatMetaPill>
                            {t("total")} · {currentCount}
                        </StatMetaPill>
                    </div>
                    <StatFilterToolbar
                        allCurrencies={allCurrencies}
                        allFilterViews={allFilterViews}
                        baseCurrency={baseCurrency.id}
                        filterLayoutId={filterLayoutId}
                        filterViewId={filterViewId}
                        onAddFilter={toAddFilter}
                        onReorder={toReOrder}
                        onSelectFilter={(nextId) => {
                            setSliceId(undefined);
                            setFilterViewId(nextId);
                        }}
                    />
                    <DateSliced
                        {...dateSlicedProps}
                        onClickSettings={toChangeFilter}
                    >
                        <StatDimensionToggle
                            value={dimension}
                            onValueChange={(value) => {
                                setDimension(value);
                                setSelectedCategoryId(undefined);
                            }}
                        />
                    </DateSliced>
                </motion.div>
            </div>

            <motion.div
                {...getStageProps({
                    index: 1,
                    reducedMotion: prefersReducedMotion,
                    y: 14,
                })}
                className="stat-focus-shell relative z-[1] w-full max-w-[600px]"
            >
                <FocusTypeSelector
                    value={focusType}
                    onValueChange={(value) => {
                        setFocusType(value);
                        setSelectedCategoryId(undefined);
                    }}
                    money={totalMoneys}
                />
            </motion.div>

            <div className="stat-scroll-shell w-full px-2 flex-1 flex justify-center overflow-y-auto">
                <div className="stat-content-shell w-full max-w-[600px] flex flex-col items-center gap-4 relative">
                    {Part}

                    <AnimatePresence mode="wait" initial={false}>
                        {hasFiltered ? (
                            <motion.div
                                key="stat-data-stack"
                                variants={statStateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={surfaceTransition}
                                className="w-full flex flex-col gap-4"
                            >
                                {tagStructure.length > 0 && (
                                    <motion.div
                                        {...getStageProps({
                                            index: 5,
                                            reducedMotion: prefersReducedMotion,
                                            y: 14,
                                        })}
                                        className="w-full"
                                    >
                                        <StatSectionCard
                                            className="stat-data-card"
                                            icon={
                                                <i className="icon-[mdi--tag-multiple-outline] size-4"></i>
                                            }
                                            title={t("tag-details")}
                                            description={
                                                <div className="stat-meta-row">
                                                    <StatMetaPill>
                                                        {focusSummary}
                                                    </StatMetaPill>
                                                    <StatMetaPill>
                                                        {t("total")} ·{" "}
                                                        {tagStructure.length}
                                                    </StatMetaPill>
                                                </div>
                                            }
                                        >
                                            <div className="flex flex-col gap-3">
                                                {tagStructure.map((struct) => {
                                                    const index =
                                                        FocusTypes.indexOf(
                                                            focusType,
                                                        );
                                                    const money = [
                                                        struct.income,
                                                        struct.expense,
                                                        struct.income -
                                                            struct.expense,
                                                    ][index];
                                                    const total =
                                                        totalMoneys[index];

                                                    return (
                                                        <TagItem
                                                            key={struct.id}
                                                            name={struct.name}
                                                            money={money}
                                                            total={total}
                                                            type={focusType}
                                                            onClick={() => {
                                                                seeDetails({
                                                                    tags: [
                                                                        struct.id,
                                                                    ],
                                                                });
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </StatSectionCard>
                                    </motion.div>
                                )}

                                <motion.div
                                    {...getStageProps({
                                        index: 6,
                                        reducedMotion: prefersReducedMotion,
                                        y: 14,
                                    })}
                                    className="w-full"
                                >
                                    <StatSectionCard
                                        className="stat-data-card"
                                        icon={
                                            <i className="icon-[mdi--comment-text-multiple-outline] size-4"></i>
                                        }
                                        title={t("comment-cloud")}
                                        description={
                                            <div className="stat-meta-row">
                                                <StatMetaPill>
                                                    {focusSummary}
                                                </StatMetaPill>
                                                <StatMetaPill>
                                                    {t("total")} ·{" "}
                                                    {
                                                        (focusType === "expense"
                                                            ? filteredExpenseBills
                                                            : focusType ===
                                                                "income"
                                                              ? filteredIncomeBills
                                                              : filtered
                                                        ).length
                                                    }
                                                </StatMetaPill>
                                            </div>
                                        }
                                    >
                                        <AnalysisCloud
                                            bills={
                                                focusType === "expense"
                                                    ? filteredExpenseBills
                                                    : focusType === "income"
                                                      ? filteredIncomeBills
                                                      : filtered
                                            }
                                        />
                                    </StatSectionCard>
                                </motion.div>

                                {analysis && (
                                    <motion.div
                                        {...getStageProps({
                                            index: 7,
                                            reducedMotion: prefersReducedMotion,
                                            y: 14,
                                        })}
                                        className="w-full"
                                    >
                                        <StatSectionCard
                                            className="stat-data-card"
                                            icon={
                                                <i className="icon-[mdi--chart-box-outline] size-4"></i>
                                            }
                                            title={t("analysis")}
                                            description={
                                                <div className="stat-meta-row">
                                                    <StatMetaPill>
                                                        {focusSummary}
                                                    </StatMetaPill>
                                                    <StatMetaPill>
                                                        {rangeSummary}
                                                    </StatMetaPill>
                                                </div>
                                            }
                                        >
                                            <AnalysisDetail
                                                analysis={analysis}
                                                type={focusType}
                                                unit={analysisUnit}
                                            />
                                        </StatSectionCard>
                                    </motion.div>
                                )}

                                {(highestExpenseBill || highestIncomeBill) && (
                                    <motion.div
                                        {...getStageProps({
                                            index: 8,
                                            reducedMotion: prefersReducedMotion,
                                            y: 14,
                                        })}
                                        className={cn(
                                            "w-full grid gap-4",
                                            highestExpenseBill &&
                                                highestIncomeBill &&
                                                "sm:grid-cols-2",
                                        )}
                                    >
                                        {highestExpenseBill && (
                                            <StatBillHighlightCard
                                                title={t("highest-expense")}
                                                bill={highestExpenseBill}
                                            />
                                        )}
                                        {highestIncomeBill && (
                                            <StatBillHighlightCard
                                                title={t("highest-income")}
                                                bill={highestIncomeBill}
                                            />
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="stat-empty-stack"
                                variants={statStateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={surfaceTransition}
                                className="w-full"
                            >
                                <motion.div
                                    {...getStageProps({
                                        index: 6,
                                        reducedMotion: prefersReducedMotion,
                                        y: 14,
                                    })}
                                    className="w-full"
                                >
                                    <StatSectionCard
                                        className="stat-data-card stat-empty-summary"
                                        icon={
                                            <i className="icon-[mdi--chart-box-outline] size-4"></i>
                                        }
                                        title={t("analysis")}
                                    >
                                        <div className="stat-empty-copy">
                                            {t("nothing-here-add-one-bill")}
                                        </div>
                                    </StatSectionCard>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        {...getStageProps({
                            index: 9,
                            reducedMotion: prefersReducedMotion,
                            y: 12,
                        })}
                        className="stat-footer-action"
                    >
                        <Button
                            variant="ghost"
                            className="stat-link-button"
                            onClick={() => seeDetails()}
                        >
                            {t("see-all-ledgers")}
                            <i className="icon-[mdi--arrow-up-right]"></i>
                        </Button>
                    </motion.div>
                    <div className="stat-footer-spacer w-full flex-shrink-0"></div>
                </div>
            </div>
            <BillFilterViewProvider />
        </div>
    );
}

function StatFilterToolbar({
    allCurrencies,
    allFilterViews,
    baseCurrency,
    filterLayoutId,
    filterViewId,
    onAddFilter,
    onReorder,
    onSelectFilter,
}: {
    allCurrencies: {
        id: string;
        symbol: string;
    }[];
    allFilterViews: BillFilterView[];
    baseCurrency: string;
    filterLayoutId: string;
    filterViewId: string;
    onAddFilter: () => void;
    onReorder: () => void;
    onSelectFilter: (id: string) => void;
}) {
    return (
        <div className="stat-filter-row w-full flex">
            <LayoutGroup id={filterLayoutId}>
                <div className="stat-filter-chip-row flex-1 overflow-x-auto scrollbar-hidden">
                    {allFilterViews.map((filter) => {
                        const displayCurrency =
                            filter.displayCurrency === baseCurrency
                                ? undefined
                                : allCurrencies.find(
                                      (currency) =>
                                          currency.id ===
                                          filter.displayCurrency,
                                  );
                        const isActive = filterViewId === filter.id;

                        return (
                            <Button
                                key={filter.id}
                                size="sm"
                                className={cn(
                                    "stat-filter-chip relative",
                                    !isActive && "text-primary/58",
                                )}
                                variant="ghost"
                                onClick={() => {
                                    onSelectFilter(filter.id);
                                }}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="stat-filter-indicator"
                                        transition={sharedElementTransition}
                                        className="stat-chip-indicator"
                                    />
                                )}
                                <span className="relative z-[1] inline-flex items-center gap-1">
                                    {displayCurrency?.symbol}
                                    {filter.name}
                                </span>
                            </Button>
                        );
                    })}
                </div>
            </LayoutGroup>
            <div className="stat-filter-actions">
                <Button
                    variant="ghost"
                    onClick={onAddFilter}
                    size="sm"
                    className="stat-icon-button"
                >
                    <i className="icon-[mdi--plus] size-4"></i>
                </Button>
                <Button
                    variant="ghost"
                    onClick={onReorder}
                    size="sm"
                    className="stat-icon-button"
                >
                    <i className="icon-[mdi--menu] size-4"></i>
                </Button>
            </div>
        </div>
    );
}

function StatDimensionToggle({
    value,
    onValueChange,
}: {
    value: "category" | "user";
    onValueChange: (value: "category" | "user") => void;
}) {
    const t = useIntl();
    const layoutGroupId = useId();

    return (
        <LayoutGroup id={layoutGroupId}>
            <div className="stat-dimension-toggle">
                {[
                    {
                        icon: "icon-[mdi--view-grid-outline]",
                        id: "category",
                        label: t("categories"),
                    },
                    {
                        icon: "icon-[mdi--account-outline]",
                        id: "user",
                        label: t("creator"),
                    },
                ].map((item) => {
                    const isActive = value === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={cn(
                                "stat-dimension-button",
                                isActive && "stat-dimension-button-active",
                            )}
                            onClick={() => {
                                onValueChange(item.id as "category" | "user");
                            }}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="stat-dimension-indicator"
                                    transition={sharedElementTransition}
                                    className="nav-active-indicator"
                                />
                            )}
                            <span className="relative z-[1] inline-flex items-center gap-2">
                                <i className={cn(item.icon, "size-4")}></i>
                                <span>{item.label}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}

function StatBillHighlightCard({ title, bill }: { title: string; bill: Bill }) {
    return (
        <StatSectionCard
            className="stat-inline-card"
            icon={
                <i className="icon-[mdi--star-four-points-outline] size-4"></i>
            }
            title={title}
        >
            <BillItem
                className="w-full"
                bill={bill}
                showTime
                onClick={() => showBillInfo(bill)}
            />
        </StatSectionCard>
    );
}
