import dayjs from "dayjs";
import { useMemo } from "react";
import useCategory from "@/hooks/use-category";
import { useCurrency } from "@/hooks/use-currency";
import {
    listScheduledOccurrences,
    type ScheduledOccurrence,
    useScheduled,
} from "@/hooks/use-scheduled";
import PopupLayout from "@/layouts/popup-layout";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import CategoryIcon from "../category/icon";
import createConfirmProvider from "../confirm";
import Money from "../money";
import { Button } from "../ui/button";
import { showScheduled } from "./list-form";
import { persistScheduledDraft } from "./persist";
import { showScheduledEdit } from "./scheduled-form";

const UPCOMING_WINDOW_DAYS = 30;

function formatGroupDateLabel(time: number) {
    return new Date(time).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        weekday: "short",
    });
}

function formatOccurrenceDateLabel(time: number) {
    const date = new Date(time);
    if (
        date.getHours() === 0 &&
        date.getMinutes() === 0 &&
        date.getSeconds() === 0
    ) {
        return date.toLocaleDateString();
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getOccurrenceWindow() {
    const from = Date.now();
    return {
        from,
        to: dayjs(from).add(UPCOMING_WINDOW_DAYS, "day").endOf("day").valueOf(),
    };
}

function getDueLabel(t: ReturnType<typeof useIntl>, time: number) {
    const today = dayjs().startOf("day");
    const target = dayjs(time).startOf("day");
    const diffDays = target.diff(today, "day");

    if (diffDays <= 0) {
        return t("incoming-scheduled-due-today");
    }

    if (diffDays === 1) {
        return t("incoming-scheduled-due-tomorrow");
    }

    return t("incoming-scheduled-due-in-days", {
        count: diffDays,
    });
}

function ScheduledOccurrenceRow({
    occurrence,
    onEdit,
}: {
    occurrence: ScheduledOccurrence;
    onEdit: (scheduledId: string) => void;
}) {
    const t = useIntl();
    const { categories } = useCategory();
    const { allCurrencies, baseCurrency } = useCurrency();
    const category = categories.find(
        (item) => item.id === occurrence.template.categoryId,
    );
    const repeatLabel = t("repeat-by-value-unit", {
        value: occurrence.repeat.value,
        unit: t(occurrence.repeat.unit),
    });
    const targetCurrency = allCurrencies.find(
        (item) => item.id === occurrence.template.currency?.target,
    );
    const originalCurrency =
        occurrence.template.currency &&
        targetCurrency &&
        targetCurrency.id !== baseCurrency.id
            ? {
                  symbol: targetCurrency.symbol,
                  amount: occurrence.template.currency.amount,
              }
            : undefined;
    const dueLabel = getDueLabel(t, occurrence.time);

    return (
        <button
            type="button"
            className="w-full rounded-[24px] border bg-background/76 p-4 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/20"
            onClick={() => onEdit(occurrence.scheduledId)}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-1 items-start gap-3">
                    <div className="flex size-11 flex-shrink-0 items-center justify-center rounded-full border bg-background/90">
                        {category?.icon && (
                            <CategoryIcon
                                icon={category.icon}
                                className="size-5"
                            />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="truncate text-[15px] font-semibold">
                                {occurrence.title}
                            </div>
                            <div className="rounded-full border px-2 py-0.5 text-[10px] font-medium opacity-70">
                                {dueLabel}
                            </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-70">
                            {category?.name && <span>{category.name}</span>}
                            <span>{repeatLabel}</span>
                        </div>
                        {occurrence.template.comment && (
                            <div className="mt-2 line-clamp-2 text-sm opacity-80">
                                {occurrence.template.comment}
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-w-[92px] flex-shrink-0 text-right">
                    <div className="flex justify-end text-[17px] font-semibold text-red-500/85">
                        <Money
                            value={amountToNumber(occurrence.template.amount)}
                            accurate
                        />
                    </div>
                    {originalCurrency && (
                        <div className="mt-0.5 text-xs opacity-70">
                            {originalCurrency.symbol}
                            <Money
                                value={amountToNumber(originalCurrency.amount)}
                                accurate
                            />
                        </div>
                    )}
                    <div className="mt-2 text-[11px] opacity-60">
                        {formatOccurrenceDateLabel(occurrence.time)}
                    </div>
                    <div className="mt-2 flex justify-end opacity-45">
                        <i className="icon-[mdi--chevron-right] size-4" />
                    </div>
                </div>
            </div>
        </button>
    );
}

function Form({
    onCancel,
}: {
    edit?: undefined;
    onCancel?: () => void;
    onConfirm?: (value: never) => void;
}) {
    const t = useIntl();
    const { scheduleds, add, update } = useScheduled();
    const upcomingOccurrences = useMemo(() => {
        const { from, to } = getOccurrenceWindow();
        return listScheduledOccurrences({
            scheduleds,
            from,
            to,
            enabledOnly: true,
            billType: "expense",
        });
    }, [scheduleds]);
    const totalAmount = useMemo(() => {
        return amountToNumber(
            upcomingOccurrences.reduce((sum, item) => {
                return sum + item.template.amount;
            }, 0),
        );
    }, [upcomingOccurrences]);
    const nextOccurrence = upcomingOccurrences[0];
    const scheduledLookup = useMemo(() => {
        return new Map(scheduleds.map((item) => [item.id, item]));
    }, [scheduleds]);

    const groupedOccurrences = useMemo(() => {
        const grouped = new Map<string, ScheduledOccurrence[]>();

        for (const occurrence of upcomingOccurrences) {
            const key = dayjs(occurrence.time).format("YYYY-MM-DD");
            const list = grouped.get(key) ?? [];
            list.push(occurrence);
            grouped.set(key, list);
        }

        return Array.from(grouped.entries()).map(([key, items]) => ({
            key,
            label: formatGroupDateLabel(items[0]?.time ?? Date.now()),
            items,
        }));
    }, [upcomingOccurrences]);

    const handleCreateScheduled = async () => {
        const draft = await showScheduledEdit();
        await persistScheduledDraft({
            draft,
            add,
            update,
        });
    };

    const handleEditScheduled = async (scheduledId: string) => {
        const target = scheduledLookup.get(scheduledId);
        if (!target) {
            return;
        }

        const draft = await showScheduledEdit(target);
        await persistScheduledDraft({
            draft,
            add,
            update,
            currentId: scheduledId,
        });
    };

    return (
        <PopupLayout
            title={t("incoming-scheduled-title")}
            onBack={onCancel}
            right={
                <div className="flex items-center gap-2 pr-1">
                    <button
                        type="button"
                        className="flex size-9 items-center justify-center rounded-full border bg-background/90 shadow-sm transition-colors hover:bg-accent/30"
                        title={t("scheduled-manager")}
                        aria-label={t("scheduled-manager")}
                        onClick={() => {
                            showScheduled();
                        }}
                    >
                        <i className="icon-[mdi--calendar-edit-outline] size-4" />
                    </button>
                    <div className="rounded-full border px-2 py-1 text-[11px] opacity-70">
                        {t("incoming-scheduled-window")}
                    </div>
                </div>
            }
            className="h-full overflow-hidden"
        >
            <div className="flex h-full flex-col overflow-hidden">
                <div className="px-4 pb-3">
                    <div className="rounded-[28px] border bg-background/76 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="text-xs opacity-60">
                                    {t("incoming-scheduled-description")}
                                </div>
                                <div className="mt-2 text-lg font-semibold">
                                    {t("incoming-scheduled-count", {
                                        count: upcomingOccurrences.length,
                                    })}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs opacity-60">
                                    {t("incoming-scheduled-total-label")}
                                </div>
                                <div className="mt-2 flex justify-end text-[22px] font-semibold text-red-500/85">
                                    <Money value={totalAmount} accurate />
                                </div>
                            </div>
                        </div>
                        {nextOccurrence && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                <div className="rounded-full border px-2.5 py-1 font-medium opacity-75">
                                    {getDueLabel(t, nextOccurrence.time)}
                                </div>
                                <div className="opacity-65">
                                    {t("incoming-scheduled-next-label", {
                                        title: nextOccurrence.title,
                                        date: formatOccurrenceDateLabel(
                                            nextOccurrence.time,
                                        ),
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-4">
                    {groupedOccurrences.length === 0 ? (
                        <div className="rounded-[24px] border bg-background/76 px-5 py-8 text-center text-sm shadow-sm backdrop-blur-sm">
                            <div className="opacity-70">
                                {t("incoming-scheduled-empty")}
                            </div>
                            <div className="mt-4">
                                <Button onClick={handleCreateScheduled}>
                                    <i className="icon-[mdi--add]" />
                                    {t("add-a-scheduled")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {groupedOccurrences.map((group) => (
                                <section
                                    key={group.key}
                                    className="flex flex-col gap-2"
                                >
                                    <div className="px-1 text-xs font-semibold uppercase tracking-[0.18em] opacity-55">
                                        {group.label}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {group.items.map((occurrence) => (
                                            <ScheduledOccurrenceRow
                                                key={`${occurrence.scheduledId}-${occurrence.time}`}
                                                occurrence={occurrence}
                                                onEdit={handleEditScheduled}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    );
}

const [IncomingScheduledProvider, showIncomingScheduled] =
    createConfirmProvider(Form, {
        dialogTitle: "incoming-scheduled-title",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[70vh] sm:w-[90vw] sm:max-w-[520px]",
    });

export { IncomingScheduledProvider, showIncomingScheduled };
