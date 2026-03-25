/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */

import dayjs from "dayjs";
import { Collapsible } from "radix-ui";
import { useMemo } from "react";
import useCategory from "@/hooks/use-category";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import { openBudgetDetail } from "@/utils/deferred-openers";
import { BudgetBar } from "./detail-form";
import type { Budget } from "./type";
import { useBudgetDetail } from "./use-budget-detail";
import { budgetEncountered } from "./util";

export default function BudgetCard({
    className,
    budget,
}: {
    className?: string;
    budget: Budget;
}) {
    const t = useIntl();
    const { bills } = useLedgerStore();
    const { total, currentRange } = useBudgetDetail(budget);
    const { categories } = useCategory();
    const encountered = useMemo(
        () =>
            currentRange
                ? budgetEncountered(budget, bills, currentRange, categories)
                : undefined,
        [budget, bills, currentRange, categories],
    );

    const todayEncountered = useMemo(
        () =>
            currentRange
                ? budgetEncountered(
                      budget,
                      bills,
                      [dayjs().startOf("day"), dayjs().endOf("day")],
                      categories,
                  )
                : undefined,
        [budget, bills, currentRange, categories],
    );

    const time = useMemo(() => {
        if (!currentRange) {
            return undefined;
        }
        const now = dayjs();
        const spend = now.diff(currentRange[0]);
        const duration = currentRange[1].diff(currentRange[0]);
        const totalDays = Math.ceil(dayjs.duration(duration).asDays());
        const spendDays = Math.floor(dayjs.duration(spend).asDays());
        const leftDays = Math.max(0, totalDays - spendDays);
        return { percent: spend / duration, leftDays, totalDays };
    }, [currentRange]);
    const todayLeft = useMemo(() => {
        if (!encountered || !todayEncountered || !time) {
            return undefined;
        }
        return (
            (total - encountered.totalUsed) / Math.max(1, time.leftDays) -
            todayEncountered.totalUsed
        ).toFixed(2);
    }, [encountered, time, todayEncountered, total]);

    if (!encountered) {
        return (
            <div
                className={cn(
                "home-budget-card rounded-2xl border flex flex-col w-full px-4 py-3 cursor-pointer",
                    className,
                )}
                onClick={() => {
                    void openBudgetDetail(budget);
                }}
            >
                <div className="font-semibold">{budget.title}</div>
                <div className="text-xs opacity-60">{t("budget-finished")}</div>
            </div>
        );
    }

    const CategoryBudgetDetails = (
        <>
            {encountered?.categoriesUsed?.map((v) => {
                const category = categories.find((c) => c.id === v.id);
                const total =
                    budget.categoriesBudget?.find((c) => c.id === v.id)
                        ?.budget ?? 0;
                const td = todayEncountered?.categoriesUsed?.find(
                    (c) => c.id === v.id,
                );
                return (
                    <div key={v.id}>
                        {category?.name}
                        <BudgetBar
                            total={total}
                            used={v.used}
                            todayUsed={td?.used}
                            time={time}
                        />
                    </div>
                );
            })}
        </>
    );

    return (
        <div
            className={cn(
                "home-budget-card rounded-2xl border flex flex-col w-full px-4 py-3 cursor-pointer",
            className,
        )}
        onClick={() => {
                void openBudgetDetail(budget);
        }}
    >
            <Collapsible.Root className="group">
                <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                    <div className="min-w-0 truncate font-semibold">
                        {budget.title}
                    </div>
                    {todayLeft && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/12 px-2.5 py-1 text-[11px] whitespace-nowrap">
                            <span className="opacity-65">
                                {t("today-left")}
                            </span>
                            <span className="font-semibold tabular-nums">
                                {todayLeft}
                            </span>
                        </div>
                    )}
                </div>
                {budget.totalBudget !== 0 ? (
                    <div className="mt-2 flex flex-col">
                        <BudgetBar
                            total={total}
                            used={encountered.totalUsed}
                            todayUsed={todayEncountered?.totalUsed}
                            time={time}
                        />
                        <div>
                            {(encountered?.categoriesUsed?.length ?? 0) > 0 && (
                                <Collapsible.Trigger
                                    className="mt-1 h-4 flex justify-end w-full group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <i className=" group-[[data-state=open]]:icon-[mdi--chevron-down] group-[[data-state=closed]]:icon-[mdi--chevron-up]" />
                                </Collapsible.Trigger>
                            )}
                        </div>
                        <Collapsible.Content className="data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close data-[state=closed]:overflow-hidden">
                            {CategoryBudgetDetails}
                        </Collapsible.Content>
                    </div>
                ) : (
                    CategoryBudgetDetails
                )}
            </Collapsible.Root>
        </div>
    );
}
