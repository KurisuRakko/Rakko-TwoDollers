/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import dayjs from "dayjs";
import { useMemo, useRef, useState } from "react";
import useCategory from "@/hooks/use-category";
import { useSnap } from "@/hooks/use-snap";
import createTeleportSlot from "@/hooks/use-teleport";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useLedgerStore } from "@/store/ledger";
import { cn } from "@/utils";
import { denseDate } from "@/utils/time";
import { Button } from "../ui/button";
import type { Budget } from "./type";
import { useBudgetDetail } from "./use-budget-detail";
import { budgetEncountered, budgetReached } from "./util";

function BudgetProgress({
    total,
    used,
    timePercent,
    todayUsed,
}: {
    total: number;
    used: number;
    timePercent: number;
    todayUsed?: number;
}) {
    const safeTotal = Math.max(total, 1);
    const p = used / safeTotal;
    const tp = (todayUsed ?? 0) / safeTotal;
    const totalLeft = total - used;
    const markerPercent = Math.min(Math.max(timePercent, 0), 1);
    // 计算超支进度条
    const overs = useMemo(() => {
        if (totalLeft >= 0) {
            return [];
        }
        const p = Math.abs(totalLeft) / safeTotal;
        const i = Math.floor(p);
        return [...Array.from({ length: Math.min(i, 3) }, () => 1), p - i];
    }, [safeTotal, totalLeft]);

    return (
        <div className="relative flex h-5 w-full items-center">
            <div className="relative flex h-2.5 w-full items-center overflow-hidden rounded-full bg-foreground/16">
                <div
                    className="absolute top-0 h-2.5 rounded-full bg-amber-500"
                    style={{
                        width: `${(tp + p) * 100}%`,
                    }}
                />
                <div
                    className="absolute left-0 top-0 h-2.5 rounded-full bg-primary/70"
                    style={{
                        width: `${p * 100}%`,
                    }}
                />
                {overs.map((p, i) => {
                    return (
                        <div
                            key={i}
                            className={cn(
                                "absolute left-0 top-0 h-2.5 rounded-full bg-fuchsia-700/80",
                            )}
                            style={{
                                width: `${p * 100}%`,
                            }}
                        />
                    );
                })}
            </div>
            <div
                className="absolute top-0 h-5 w-[3px] rounded-full bg-slate-500/80 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                style={{
                    left: `${markerPercent * 100}%`,
                    transform: "translateX(-50%)",
                }}
            />
        </div>
    );
}

function BudgetMetricLine({
    label,
    value,
    align = "start",
}: {
    label: string;
    value: string;
    align?: "start" | "end";
}) {
    return (
        <div
            className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 whitespace-nowrap",
                align === "end" && "text-right",
            )}
        >
            <span className="truncate opacity-70">{label}</span>
            <span className="justify-self-end font-medium tabular-nums">
                {value}
            </span>
        </div>
    );
}

export function BudgetBar({
    total,
    used,
    todayUsed,
    time,
}: {
    total: number;
    used: number;
    todayUsed?: number;
    time?: { percent: number; leftDays: number; totalDays: number };
}) {
    const t = useIntl();

    const totalLeft = total - used;
    return (
        <>
            <BudgetProgress
                total={total}
                used={used}
                todayUsed={todayUsed}
                timePercent={time?.percent ?? 1}
            />
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex min-w-0 flex-col gap-1">
                    <BudgetMetricLine
                        label={t("expensed")}
                        value={used.toFixed(2)}
                    />
                    {todayUsed !== undefined && (
                        <BudgetMetricLine
                            label={t("today-expense")}
                            value={todayUsed.toFixed(2)}
                        />
                    )}
                    {time && (
                        <BudgetMetricLine
                            label={t("daily-expense")}
                            value={(
                                used /
                                Math.max(1, time.totalDays - time.leftDays)
                            ).toFixed(2)}
                        />
                    )}
                </div>
                <div className="flex min-w-0 flex-col gap-1 text-end">
                    <BudgetMetricLine
                        label={t("total-budget")}
                        value={total.toFixed(2)}
                        align="end"
                    />
                    {totalLeft > 0 ? (
                        <BudgetMetricLine
                            label={t("total-left")}
                            value={totalLeft.toFixed(2)}
                            align="end"
                        />
                    ) : (
                        <div className="flex items-baseline justify-end gap-2 whitespace-nowrap font-semibold opacity-90">
                            <span>{t("overspending")}</span>
                            <span className="tabular-nums">
                                {totalLeft.toFixed(2)}
                            </span>
                        </div>
                    )}
                    {time && (
                        <BudgetMetricLine
                            label={t("daily-left")}
                            value={(
                                totalLeft / Math.max(1, time.leftDays)
                            ).toFixed(2)}
                            align="end"
                        />
                    )}
                </div>
            </div>
        </>
    );
}

const Portal = createTeleportSlot();

function BudgetDetail({
    budget,
    onCancel,
}: {
    budget: Budget;
    onCancel?: () => void;
    onConfirm?: (v?: any) => void;
}) {
    const t = useIntl();
    const { bills } = useLedgerStore();
    const { categories } = useCategory();
    const { currentRange, getTime, total, allRanges } = useBudgetDetail(budget);
    const initialIndex = currentRange
        ? allRanges.findIndex((rs) => rs[0].isSame(currentRange[0]))
        : allRanges.length - 1;
    const [selectedIndex, setSelectedIndex] = useState(initialIndex);

    const scrollRef = useRef<HTMLDivElement>(null);
    useSnap(scrollRef, initialIndex);

    const budgetRanges = useMemo(() => {
        return allRanges.map((range, index) => {
            const latestTime = bills[0].time;

            const active = latestTime >= range[0].unix() * 1000;
            const totalReached = active
                ? budgetReached(budget, bills, range, categories)
                : undefined;

            return {
                id: index,
                range,
                reached: totalReached?.map((v) => v[1]),
                active,
                label: (
                    <>
                        {denseDate(range[0], ".")} - {denseDate(range[1], ".")}
                    </>
                ),
            };
        });
    }, [allRanges, bills, budget, categories]);
    const reachedCount =
        budgetRanges.filter((b) => b.reached?.every((r) => r)).length - 1;

    const selectedRange = allRanges[selectedIndex];

    const encountered = useMemo(
        () =>
            selectedRange
                ? budgetEncountered(budget, bills, selectedRange, categories)
                : undefined,
        [budget, bills, selectedRange, categories],
    );

    const time = useMemo(
        () => (selectedRange ? getTime(selectedRange) : undefined),
        [selectedRange, getTime],
    );

    const isTodayInRange = useMemo(() => {
        const today = dayjs();
        return (
            today.isSameOrAfter(selectedRange[0]) &&
            today.isSameOrBefore(selectedRange[1])
        );
    }, [selectedRange]);

    const todayEncountered = useMemo(
        () =>
            isTodayInRange && currentRange
                ? budgetEncountered(
                      budget,
                      bills,
                      [dayjs().startOf("day"), dayjs().endOf("day")],
                      categories,
                  )
                : undefined,
        [isTodayInRange, currentRange, bills, budget, categories],
    );

    return (
        <>
            <Portal.Teleport>
                <div
                    className={cn(
                        "text-xs flex justify-center items-center gap-1",
                        reachedCount > 0 ? "text-green-700" : "opacity-60",
                    )}
                >
                    <i className="icon-[mdi--medal-outline]"></i>
                    {reachedCount > 0
                        ? t("budget-reached-times", { n: reachedCount })
                        : t("budget-reached-not-yet")}
                </div>
            </Portal.Teleport>
            <div
                ref={scrollRef}
                className="w-full flex gap-2 px-4 overflow-x-auto scrollbar-hidden snap-mandatory snap-x pb-2"
            >
                {budgetRanges.map(({ label, id, active, reached }, i) => (
                    <Button
                        variant={i === selectedIndex ? "default" : "ghost"}
                        key={id}
                        className="flex-shrink-0 text-sm snap-center"
                        disabled={!active}
                        title={
                            reached
                                ? reached.every((r) => r)
                                    ? t("budget-reached")
                                    : t("budget-unreached")
                                : t("budget-not-time")
                        }
                        onClick={() => setSelectedIndex(i)}
                    >
                        <div className="flex flex-col justify-center items-center">
                            {label}
                            <div className="flex justify-center items-center gap-1 h-1">
                                {reached?.map((r, i) => (
                                    <div
                                        key={i}
                                        className={`w-1 h-1 rounded-full ${
                                            r
                                                ? "bg-primary/80"
                                                : "bg-muted-foreground/40"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </Button>
                ))}
                <Button
                    variant="ghost"
                    className="flex-shrink-0 text-sm"
                    disabled
                >
                    {budget.end ? (
                        "END"
                    ) : (
                        <i className="icon-[mdi--infinity] size-5"></i>
                    )}
                </Button>
            </div>
            {encountered && (
                <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-6">
                    <div>
                        {t("total-budget")}
                        <BudgetBar
                            total={total}
                            used={encountered.totalUsed}
                            todayUsed={todayEncountered?.totalUsed}
                            time={time}
                        />
                    </div>
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
                </div>
            )}
        </>
    );
}

export function BudgetDetailForm({
    edit: budget,
    onCancel,
}: {
    edit?: Budget;
    onCancel?: () => void;
    onConfirm?: (v?: any) => void;
}) {
    return (
        <Portal.Provider>
            <PopupLayout
                title={budget?.title}
                right={<Portal.Slot className="px-2" />}
                onBack={onCancel}
                className="h-full overflow-hidden"
            >
                {budget && <BudgetDetail budget={budget} />}
            </PopupLayout>
        </Portal.Provider>
    );
}
