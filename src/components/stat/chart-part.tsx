import type { ECElementEvent } from "echarts/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
    type ComponentProps,
    type CSSProperties,
    useCallback,
    useMemo,
    useState,
} from "react";
import useCategory from "@/hooks/use-category";
import { useCreators } from "@/hooks/use-creator";
import { useCurrency } from "@/hooks/use-currency";
import type { BillFilter } from "@/ledger/extra-type";
import type { Bill } from "@/ledger/type";
import { useIntl } from "@/locale";
import { cn } from "@/utils";
import {
    overallTrendOption,
    processBillDataForCharts,
    structureOption,
    userTrendOption,
} from "@/utils/charts";
import {
    getStageProps,
    reducedStateSwapVariants,
    stateSwapVariants,
    surfaceTransition,
} from "@/utils/motion";
import { toFixed } from "@/utils/number";
import CategoryIcon from "../category/icon";
import Chart from "../chart";
import Money from "../money";
import { Button } from "../ui/button";
import CalendarDetail from "./calendar-detail";
import type { ViewType } from "./date-slice";
import type { FocusType } from "./focus-type";
import {
    StatHeaderIconButton,
    StatLegendItem,
    StatMetaPill,
    StatSectionCard,
} from "./section-card";
import { StaticItem } from "./static-item";

type CalendarDataset = ComponentProps<typeof CalendarDetail>["dataset"];
type StructureDatum = {
    value: number;
    name: string;
    id: string;
    itemStyle?: {
        color?: string;
    };
};
type StructureSeries = {
    data: StructureDatum[];
}[];

const CATEGORY_FOCUS_ORDER: FocusType[] = ["income", "expense", "balance"];

export function useChartPart({
    viewType,
    seeDetails,
    focusType,
    filtered,
    dimension,
    displayCurrency,
}: {
    viewType: ViewType;
    seeDetails: (append?: Partial<BillFilter>) => void;
    focusType: FocusType;
    filtered: Bill[];
    dimension: "category" | "user";
    displayCurrency?: string;
}) {
    const t = useIntl();
    const prefersReducedMotion = Boolean(useReducedMotion());

    const { convert, baseCurrency } = useCurrency();
    const rateToDisplayCurrency = useMemo(() => {
        return displayCurrency
            ? convert(1, displayCurrency, baseCurrency.id).predict
            : 1;
    }, [displayCurrency, baseCurrency.id, convert]);

    const [asCalendar, setAsCalendar] = useState(false);
    const [asList, setAsList] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>();

    const { categories } = useCategory();
    const creators = useCreators();

    const dataSources = useMemo(
        () =>
            processBillDataForCharts(
                {
                    bills: filtered,
                    getCategory: (id) => {
                        const cate = categories.find((c) => c.id === id);
                        if (!cate?.parent) {
                            return cate
                                ? { ...cate, parent: { ...cate } }
                                : { id, name: id, parent: { id, name: id } };
                        }
                        const parent =
                            categories.find((c) => c.id === cate.parent) ??
                            cate;
                        return { ...cate, parent };
                    },
                    getUserInfo: (id) => {
                        return {
                            id,
                            name:
                                creators.find((u) => `${u.id}` === id)
                                    ?.displayName ?? `${id}`,
                        };
                    },
                    gap: viewType === "yearly" ? "month" : undefined,
                    displayCurrency,
                    rateToDisplayCurrency,
                },
                t,
            ),
        [
            filtered,
            viewType,
            categories,
            creators,
            displayCurrency,
            rateToDisplayCurrency,
            t,
        ],
    );

    const trendTitle =
        dimension === "category"
            ? t("overall-trend")
            : focusType === "expense"
              ? t("users-expense-trend")
              : focusType === "income"
                ? t("users-income-trend")
                : t("users-balance-trend");
    const structureTitle =
        focusType === "income" ? t("income-structure") : t("expense-structure");

    const charts = useMemo(() => {
        if (dimension === "category") {
            const incomeName = dataSources.overallTrend.source?.[0]?.[1];
            const expenseName = dataSources.overallTrend.source?.[0]?.[2];
            const balanceName = dataSources.overallTrend.source?.[0]?.[3];

            return [
                overallTrendOption(dataSources.overallTrend, {
                    title: {
                        show: false,
                    },
                    legend: {
                        show: false,
                        selected: {
                            [incomeName]: focusType === "income",
                            [expenseName]: focusType === "expense",
                            [balanceName]: focusType === "balance",
                        },
                    },
                }),
                focusType === "expense"
                    ? structureOption(dataSources.expenseStructure, {
                          title: { show: false },
                          legend: { show: false },
                      })
                    : focusType === "income"
                      ? structureOption(dataSources.incomeStructure, {
                            title: { show: false },
                            legend: { show: false },
                        })
                      : structureOption(dataSources.expenseStructure, {
                            title: { show: false },
                            legend: { show: false },
                        }),
            ];
        }

        return [
            focusType === "expense"
                ? userTrendOption(dataSources.userExpenseTrend, {
                      title: { show: false },
                      legend: { show: false },
                  })
                : focusType === "income"
                  ? userTrendOption(dataSources.userIncomeTrend, {
                        title: { show: false },
                        legend: { show: false },
                    })
                  : userTrendOption(dataSources.userBalanceTrend, {
                        title: { show: false },
                        legend: { show: false },
                    }),
            focusType === "expense"
                ? structureOption(dataSources.userExpenseStructure, {
                      title: { show: false },
                      legend: { show: false },
                  })
                : focusType === "income"
                  ? structureOption(dataSources.userIncomeStructure, {
                        title: { show: false },
                        legend: { show: false },
                    })
                  : structureOption(dataSources.userBalanceStructure, {
                        title: { show: false },
                        legend: { show: false },
                    }),
        ];
    }, [
        dimension,
        focusType,
        dataSources.overallTrend,
        dataSources.incomeStructure,
        dataSources.expenseStructure,
        dataSources.userIncomeStructure,
        dataSources.userExpenseStructure,
        dataSources.userBalanceStructure,
        dataSources.userBalanceTrend,
        dataSources.userExpenseTrend,
        dataSources.userIncomeTrend,
    ]);

    const trendLegendItems = useMemo(() => {
        const header = (
            charts[0]?.dataset as
                | {
                      source?: (string | number)[][];
                  }
                | undefined
        )?.source?.[0];
        const series = Array.isArray(charts[0]?.series) ? charts[0].series : [];
        if (!Array.isArray(header)) {
            return [];
        }

        return header.slice(1).map((item, index) => {
            const optionSeries = series[index] as
                | {
                      color?: string;
                  }
                | undefined;
            return {
                color: optionSeries?.color ?? "currentColor",
                name: `${item ?? ""}`,
                active:
                    dimension === "category"
                        ? CATEGORY_FOCUS_ORDER[index] === focusType
                        : true,
            };
        });
    }, [charts, dimension, focusType]);

    const structureSeries = charts[1]?.series as StructureSeries | undefined;
    const structureItems = structureSeries?.[0]?.data ?? [];
    const structureTotal = structureItems.reduce(
        (sum, item) => sum + item.value,
        0,
    );
    const topStructureItem = structureItems[structureItems.length - 1];
    const topStructurePercent =
        topStructureItem && structureTotal > 0
            ? (topStructureItem.value / structureTotal) * 100
            : 0;

    const onStructureChartClick = useCallback((params: ECElementEvent) => {
        if (params.componentType === "series" && params.seriesType === "pie") {
            setSelectedCategoryId(
                (params.data as StructureSeries[number]["data"][number]).id,
            );
        }
    }, []);

    const selectedCategory = useMemo(() => {
        return categories.find((c) => c.id === selectedCategoryId);
    }, [categories, selectedCategoryId]);

    const selectedCategoryChart = useMemo(() => {
        if (dimension !== "category" || !selectedCategory) {
            return undefined;
        }
        const data = dataSources.subCategoryStructure[selectedCategory.id];
        if (!data) {
            return undefined;
        }
        return structureOption(data, {
            title: { show: false },
            legend: { show: false },
        });
    }, [dimension, dataSources.subCategoryStructure, selectedCategory]);

    const selectedCategorySeries = selectedCategoryChart?.series as
        | StructureSeries
        | undefined;

    const calendarRange = useMemo(
        () => [filtered[0]?.time, filtered[filtered.length - 1]?.time],
        [
            filtered[0]?.time,
            filtered[filtered.length - 1]?.time,
            filtered.length,
        ],
    );

    const isEmpty = filtered.length === 0;
    const shellStateVariants = prefersReducedMotion
        ? reducedStateSwapVariants
        : stateSwapVariants;
    const shellStateTransition = prefersReducedMotion
        ? { duration: 0.16 }
        : surfaceTransition;
    const trendDataset = charts[0]?.dataset as CalendarDataset | undefined;

    const openStructureDetails = useCallback(
        (item: StructureDatum) => {
            if (dimension === "category") {
                seeDetails({
                    categories: categories
                        .filter((c) => c.id === item.id || c.parent === item.id)
                        .map((c) => c.id),
                });
                return;
            }
            seeDetails({
                creators: [item.id],
            });
        },
        [categories, dimension, seeDetails],
    );

    const openSelectedCategoryDetails = useCallback(
        (item: StructureDatum) => {
            seeDetails({
                categories: [item.id],
            });
        },
        [seeDetails],
    );

    if (isEmpty) {
        const Part = (
            <>
                <motion.div
                    {...getStageProps({
                        index: 2,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="stat-card stat-chart-card stat-empty-card flex-shrink-0 w-full min-h-[220px]"
                >
                    <div className="stat-empty-icon">
                        <i className="icon-[mdi--chart-timeline-variant] size-7"></i>
                    </div>
                    <div className="stat-empty-title">{t("overall-trend")}</div>
                    <div className="stat-empty-copy">
                        {t("nothing-here-add-one-bill")}
                    </div>
                </motion.div>
                {focusType !== "balance" && (
                    <motion.div
                        {...getStageProps({
                            index: 3,
                            reducedMotion: prefersReducedMotion,
                        })}
                        className="stat-card stat-chart-card stat-empty-card flex-shrink-0 w-full min-h-[220px]"
                    >
                        <div className="stat-empty-icon">
                            <i className="icon-[mdi--chart-donut] size-7"></i>
                        </div>
                        <div className="stat-empty-title">{structureTitle}</div>
                        <div className="stat-empty-copy">
                            {t("nothing-here-add-one-bill")}
                        </div>
                    </motion.div>
                )}
            </>
        );

        return { dataSources, Part, setSelectedCategoryId };
    }

    const Part = (
        <>
            <motion.div
                {...getStageProps({
                    index: 2,
                    reducedMotion: prefersReducedMotion,
                })}
                className="w-full"
            >
                <StatSectionCard
                    className="stat-chart-card"
                    icon={
                        <i className="icon-[mdi--chart-timeline-variant] size-4"></i>
                    }
                    title={trendTitle}
                    description={
                        <>
                            <div className="stat-legend-row">
                                {trendLegendItems.map((item) => (
                                    <StatLegendItem
                                        key={item.name}
                                        label={item.name}
                                        color={item.color}
                                        active={item.active}
                                    />
                                ))}
                            </div>
                            <div className="stat-meta-row">
                                <StatMetaPill>
                                    {dimension === "category"
                                        ? t("categories")
                                        : t("creator")}
                                </StatMetaPill>
                                <StatMetaPill>
                                    {focusType === "balance"
                                        ? t("Balance")
                                        : t(focusType)}
                                </StatMetaPill>
                                <StatMetaPill>
                                    {viewType === "custom"
                                        ? t("custom")
                                        : t(`stat-view-${viewType}`)}
                                </StatMetaPill>
                            </div>
                        </>
                    }
                    actions={
                        viewType !== "custom" && (
                            <StatHeaderIconButton
                                active={asCalendar}
                                onClick={() => {
                                    setAsCalendar((v) => !v);
                                }}
                                aria-label={trendTitle}
                            >
                                <i className="icon-[mdi--calendar-month-outline] size-4" />
                            </StatHeaderIconButton>
                        )
                    }
                    bodyClassName="pt-0"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {asCalendar && viewType !== "custom" ? (
                            <motion.div
                                key={`trend-calendar-${dimension}-${focusType}-${viewType}`}
                                variants={shellStateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={shellStateTransition}
                                className="stat-chart-panel"
                            >
                                <CalendarDetail
                                    viewType={viewType}
                                    focusType={focusType}
                                    dataset={trendDataset ?? { source: [] }}
                                    dimension={dimension}
                                    range={calendarRange}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`trend-chart-${dimension}-${focusType}-${viewType}`}
                                variants={shellStateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={shellStateTransition}
                                className="stat-chart-panel"
                            >
                                <Chart
                                    key={dimension}
                                    option={charts[0]}
                                    className="w-full h-[220px] sm:h-[264px]"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </StatSectionCard>
            </motion.div>

            {focusType !== "balance" && (
                <motion.div
                    {...getStageProps({
                        index: 3,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="w-full"
                >
                    <StatSectionCard
                        className="stat-chart-card"
                        icon={
                            <i className="icon-[mdi--chart-donut] size-4"></i>
                        }
                        title={
                            asList
                                ? focusType === "income"
                                    ? t("income-details")
                                    : t("expense-details")
                                : structureTitle
                        }
                        description={
                            !asList && (
                                <div className="stat-meta-row">
                                    <StatMetaPill>
                                        {dimension === "category"
                                            ? t("categories")
                                            : t("creator")}
                                    </StatMetaPill>
                                    <StatMetaPill>
                                        {t("total")} · {structureItems.length}
                                    </StatMetaPill>
                                    {topStructureItem && (
                                        <StatMetaPill>
                                            {topStructureItem.name} ·{" "}
                                            {toFixed(topStructurePercent, 1)}%
                                        </StatMetaPill>
                                    )}
                                </div>
                            )
                        }
                        actions={
                            <StatHeaderIconButton
                                active={asList}
                                onClick={() => {
                                    setAsList((v) => !v);
                                }}
                                aria-label={structureTitle}
                            >
                                <i className="icon-[mdi--format-list-bulleted] size-4" />
                            </StatHeaderIconButton>
                        }
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {asList ? (
                                <motion.div
                                    key={`structure-list-${dimension}-${focusType}-${selectedCategoryId ?? "root"}`}
                                    variants={shellStateVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={shellStateTransition}
                                    className="stat-structure-list-shell"
                                >
                                    <ListChart
                                        series={structureSeries}
                                        focusType={focusType}
                                        dimension={dimension}
                                        onItemClick={(item) => {
                                            if (dimension === "category") {
                                                setSelectedCategoryId(item.id);
                                            }
                                        }}
                                        onItemMoneyClick={openStructureDetails}
                                    />
                                    {selectedCategorySeries && (
                                        <div className="stat-substructure-group">
                                            <div className="stat-substructure-title">
                                                {selectedCategory?.name}
                                            </div>
                                            <ListChart
                                                series={selectedCategorySeries}
                                                focusType={focusType}
                                                dimension="category"
                                                onItemMoneyClick={
                                                    openSelectedCategoryDetails
                                                }
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={`structure-chart-${dimension}-${focusType}`}
                                    variants={shellStateVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={shellStateTransition}
                                    className="stat-structure-shell"
                                >
                                    <div className="stat-donut-panel">
                                        <Chart
                                            key={dimension}
                                            option={charts[1]}
                                            className="w-full h-[236px] sm:h-[256px]"
                                            onClick={onStructureChartClick}
                                        />
                                    </div>
                                    <StructureSummaryList
                                        items={structureSeries?.[0]?.data}
                                        focusType={focusType}
                                        dimension={dimension}
                                        categories={categories}
                                        onItemMoneyClick={openStructureDetails}
                                        limit={4}
                                    />
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            variant="ghost"
                                            size={"sm"}
                                            className="stat-link-button"
                                            onClick={() => {
                                                seeDetails({
                                                    type: focusType,
                                                });
                                            }}
                                        >
                                            {focusType === "expense"
                                                ? t("see-expense-ledgers")
                                                : t("see-income-ledgers")}
                                            <i className="icon-[mdi--arrow-up-right]"></i>
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </StatSectionCard>
                </motion.div>
            )}

            {!asList && selectedCategoryChart && (
                <motion.div
                    {...getStageProps({
                        index: 4,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="w-full"
                >
                    <StatSectionCard
                        className="stat-chart-card"
                        icon={
                            selectedCategory ? (
                                <CategoryIcon icon={selectedCategory.icon} />
                            ) : (
                                <i className="icon-[mdi--shape-outline] size-4" />
                            )
                        }
                        title={selectedCategory?.name}
                        description={
                            selectedCategorySeries?.[0]?.data?.length ? (
                                <div className="stat-meta-row">
                                    <StatMetaPill>
                                        {structureTitle}
                                    </StatMetaPill>
                                    <StatMetaPill>
                                        {t("total")} ·{" "}
                                        {selectedCategorySeries[0].data.length}
                                    </StatMetaPill>
                                </div>
                            ) : undefined
                        }
                    >
                        <motion.div
                            variants={shellStateVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={shellStateTransition}
                            className="stat-structure-shell"
                        >
                            <div className="stat-donut-panel">
                                <Chart
                                    option={selectedCategoryChart}
                                    className="w-full h-[228px] sm:h-[248px]"
                                />
                            </div>
                            <StructureSummaryList
                                items={selectedCategorySeries?.[0]?.data}
                                focusType={focusType}
                                dimension="category"
                                categories={categories}
                                onItemMoneyClick={openSelectedCategoryDetails}
                            />
                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="ghost"
                                    size={"sm"}
                                    onClick={() => {
                                        if (selectedCategory) {
                                            seeDetails({
                                                categories: [
                                                    selectedCategory.id,
                                                ],
                                            });
                                        }
                                    }}
                                >
                                    {t("see-category-ledgers")}
                                    <i className="icon-[mdi--arrow-up-right]"></i>
                                </Button>
                            </div>
                        </motion.div>
                    </StatSectionCard>
                </motion.div>
            )}
        </>
    );

    return {
        Part,
        dataSources,
        setSelectedCategoryId,
    };
}

function ListChart({
    series,
    focusType,
    dimension,
    onItemClick,
    onItemMoneyClick,
}: {
    series?: StructureSeries;
    focusType: FocusType;
    dimension: "category" | "user";
    onItemClick?: (item: StructureDatum) => void;
    onItemMoneyClick?: (item: StructureDatum) => void;
}) {
    const { categories } = useCategory();
    const total =
        series?.[0]?.data?.reduce((sum, item) => sum + item.value, 0) ?? 1;

    return (
        <div className="flex flex-col gap-3">
            {series?.[0]?.data?.map((item) => {
                const category = categories.find((c) => c.id === item.id);
                const displayName =
                    dimension === "category"
                        ? (category?.name ?? item.name)
                        : item.name;

                return (
                    <StaticItem
                        key={item.id}
                        money={item.value}
                        percent={item.value / total}
                        type={focusType}
                        className="min-h-[86px]"
                        onClick={() => {
                            onItemClick?.(item);
                        }}
                        onMoneyClick={() => {
                            onItemMoneyClick?.(item);
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="stat-breakdown-swatch"
                                style={
                                    {
                                        "--stat-breakdown-color":
                                            item.itemStyle?.color ??
                                            "currentColor",
                                    } as CSSProperties
                                }
                            >
                                {dimension === "category" && category ? (
                                    <CategoryIcon icon={category.icon} />
                                ) : (
                                    <span className="stat-breakdown-swatch-dot" />
                                )}
                            </div>
                            <div className="truncate">{displayName}</div>
                        </div>
                    </StaticItem>
                );
            })}
        </div>
    );
}

function StructureSummaryList({
    items,
    focusType,
    dimension,
    categories,
    onItemMoneyClick,
    limit,
}: {
    items?: StructureDatum[];
    focusType: FocusType;
    dimension: "category" | "user";
    categories: ReturnType<typeof useCategory>["categories"];
    onItemMoneyClick?: (item: StructureDatum) => void;
    limit?: number;
}) {
    const total = items?.reduce((sum, item) => sum + item.value, 0) ?? 1;
    const visibleItems =
        typeof limit === "number" ? items?.slice(0, limit) : items;

    return (
        <div className="stat-breakdown-list">
            {visibleItems?.map((item) => {
                const category = categories.find(
                    (entry) => entry.id === item.id,
                );
                const percent = total === 0 ? 0 : item.value / total;
                const displayName =
                    dimension === "category"
                        ? (category?.name ?? item.name)
                        : item.name;

                return (
                    <button
                        key={item.id}
                        type="button"
                        className="stat-breakdown-item"
                        onClick={() => {
                            onItemMoneyClick?.(item);
                        }}
                    >
                        <div className="stat-breakdown-main">
                            <div
                                className="stat-breakdown-swatch"
                                style={
                                    {
                                        "--stat-breakdown-color":
                                            item.itemStyle?.color ??
                                            "currentColor",
                                    } as CSSProperties
                                }
                            >
                                {dimension === "category" && category ? (
                                    <CategoryIcon icon={category.icon} />
                                ) : (
                                    <span className="stat-breakdown-swatch-dot" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-left">
                                    {displayName}
                                </div>
                                <div className="stat-breakdown-percent">
                                    {toFixed(percent * 100, 1)}%
                                </div>
                            </div>
                        </div>
                        <div
                            className={cn(
                                "stat-breakdown-money",
                                focusType === "expense"
                                    ? "text-semantic-expense"
                                    : focusType === "income"
                                      ? "text-semantic-income"
                                      : "",
                            )}
                        >
                            {focusType === "expense"
                                ? "-"
                                : focusType === "income"
                                  ? "+"
                                  : ""}
                            <Money value={item.value} />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
