import dayjs from "dayjs";
import { orderBy } from "lodash-es";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Collapsible } from "radix-ui";
import {
    startTransition,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { useShallow } from "zustand/shallow";
import { StorageDeferredAPI } from "@/api/storage";
import BillFilterForm from "@/components/bill-filter";
import Clearable from "@/components/clearable";
import Ledger from "@/components/ledger";
import {
    type BatchEditOptions,
    BatchEditProvider,
    showBatchEdit,
} from "@/components/ledger/batch-edit";
import modal from "@/components/modal";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import useCategory from "@/hooks/use-category";
import { useCurrency } from "@/hooks/use-currency";
import { useCustomFilters } from "@/hooks/use-custom-filters";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber } from "@/ledger/bill";
import type { Bill, BillFilter } from "@/ledger/type";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import {
    getStageProps,
    microHover,
    microInteractionTransition,
    microPress,
    reducedSectionEnterVariants,
    reducedStateSurfaceVariants,
    sectionEnterVariants,
    staggerChildren,
    stateSurfaceVariants,
    surfaceTransition,
} from "@/utils/motion";
import { formatDate, formatTime } from "@/utils/time";

const SORTS = [
    {
        by: "time",
        order: "desc",
        icon: "icon-[mdi--sort-clock-ascending-outline]",
        label: "newest",
    },
    {
        by: "time",
        order: "asc",
        icon: "icon-[mdi--sort-clock-descending-outline]",
        label: "oldest",
    },
    {
        by: "amount",
        order: "desc",
        icon: "icon-[mdi--sort-descending]",
        label: "highest-amount",
    },
    {
        by: "amount",
        order: "asc",
        icon: "icon-[mdi--sort-ascending]",
        label: "lowest-amount",
    },
] as const;

const SEARCH_DEBOUNCE_MS = 260;

const normalizeKeyword = (value?: string) => value?.trim().toLowerCase() ?? "";

const buildDateTokens = (timestamp: number) => {
    const date = dayjs(timestamp);
    return [
        formatDate(timestamp),
        formatTime(timestamp),
        date.format("YYYY/MM/DD"),
        date.format("MM/DD"),
        date.format("MM-DD"),
        date.format("YYYY/MM/DD HH:mm"),
    ];
};

const getSearchFormHasCriteria = (form: BillFilter) => {
    return Object.entries(form).some(([key, value]) => {
        if (key === "baseCurrency") {
            return false;
        }
        if (value === undefined || value === null) {
            return false;
        }
        if (typeof value === "string") {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        return true;
    });
};

const getActiveFilterCount = (form: BillFilter) => {
    return Object.entries(form).reduce((count, [key, value]) => {
        if (key === "keyword" || key === "baseCurrency") {
            return count;
        }
        if (value === undefined || value === null) {
            return count;
        }
        if (typeof value === "string") {
            return count + (value.trim() ? 1 : 0);
        }
        if (Array.isArray(value)) {
            return count + (value.length > 0 ? 1 : 0);
        }
        return count + 1;
    }, 0);
};

export default function Page() {
    const t = useIntl();
    const { baseCurrency } = useCurrency();
    const { categories } = useCategory();
    const { tags } = useTag();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { addFilter } = useCustomFilters();
    const prefersReducedMotion = Boolean(useReducedMotion());

    const [form, setForm] = useState<BillFilter>(() => {
        const filter = state?.filter as BillFilter | undefined;
        if (filter) {
            return {
                baseCurrency: baseCurrency.id,
                ...filter,
                categories: categories
                    .filter((category) =>
                        filter.categories?.some(
                            (value) =>
                                value === category.id ||
                                value === category.parent,
                        ),
                    )
                    .map((category) => category.id),
            };
        }
        return {};
    });
    const [filterOpen, setFilterOpen] = useState(Boolean(state?.filter));
    const [list, setList] = useState<Bill[]>([]);
    const [searchState, setSearchState] = useState<
        "idle" | "searching" | "complete"
    >("idle");
    const [sortIndex, setSortIndex] = useState(0);
    const [enableSelect, setEnableSelect] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const showAssets = usePreferenceStore(
        useShallow((current) => current.showAssetsInLedger),
    );
    const deferredKeyword = useDeferredValue(form.keyword ?? "");
    const activeFilterCount = useMemo(() => getActiveFilterCount(form), [form]);
    const hasCriteria = useMemo(() => getSearchFormHasCriteria(form), [form]);

    const effectiveForm = useMemo(
        () => ({
            ...form,
            keyword: deferredKeyword.trim() || undefined,
        }),
        [deferredKeyword, form],
    );

    const categoryNameMap = useMemo(() => {
        return new Map(
            categories.map((category) => [category.id, category.name]),
        );
    }, [categories]);

    const categoryParentMap = useMemo(() => {
        return new Map(
            categories.map((category) => [category.id, category.parent]),
        );
    }, [categories]);

    const tagNameMap = useMemo(() => {
        return new Map(tags.map((tag) => [tag.id, tag.name]));
    }, [tags]);

    const buildSearchText = useCallback(
        (bill: Bill) => {
            const categoryName = categoryNameMap.get(bill.categoryId) ?? "";
            const parentCategoryId = categoryParentMap.get(bill.categoryId);
            const parentCategoryName = parentCategoryId
                ? (categoryNameMap.get(parentCategoryId) ?? "")
                : "";
            const amount = amountToNumber(bill.amount);

            return [
                bill.comment ?? "",
                bill.categoryId,
                categoryName,
                parentCategoryName,
                ...(bill.tagIds ?? []).flatMap((id) => [
                    id,
                    tagNameMap.get(id) ?? "",
                ]),
                amount.toString(),
                amount.toFixed(2),
                Math.abs(amount).toString(),
                Math.abs(amount).toFixed(2),
                ...buildDateTokens(bill.time),
            ]
                .join(" ")
                .toLowerCase();
        },
        [categoryNameMap, categoryParentMap, tagNameMap],
    );

    const runSearch = useCallback(
        async (nextForm: BillFilter) => {
            const book = useBookStore.getState().currentBookId;
            if (!book) {
                setList([]);
                setSearchState("idle");
                return;
            }

            if (!getSearchFormHasCriteria(nextForm)) {
                startTransition(() => {
                    setList([]);
                    setSearchState("idle");
                    setEnableSelect(false);
                    setSelectedIds([]);
                });
                return;
            }

            setSearchState("searching");
            setEnableSelect(false);
            setSelectedIds([]);
            const keyword = normalizeKeyword(nextForm.keyword);
            const result = await StorageDeferredAPI.filter(book, {
                ...nextForm,
                keyword: undefined,
            });
            const filtered = keyword
                ? result.filter((bill) =>
                      buildSearchText(bill).includes(keyword),
                  )
                : result;
            startTransition(() => {
                setList(filtered);
                setSearchState("complete");
            });
        },
        [buildSearchText],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void runSearch(effectiveForm);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [effectiveForm, runSearch]);

    const sorted = useMemo(() => {
        const sort = SORTS[sortIndex] ?? SORTS[0];
        return orderBy(list, [sort.by], [sort.order]);
    }, [list, sortIndex]);

    const toReset = useCallback(() => {
        setForm({});
        setFilterOpen(false);
    }, []);

    const toSaveFilter = useCallback(async () => {
        const name = (await modal.prompt({
            title: t("please-enter-a-name-for-current-filter"),
            input: { type: "text" },
        })) as string;
        if (!name) {
            return;
        }

        const book = useBookStore.getState().currentBookId;
        if (!book) {
            return;
        }

        const id = await addFilter(name, { filter: effectiveForm });
        navigate(`/stat/${id}`);
    }, [addFilter, effectiveForm, navigate, t]);

    const onSelectChange = useCallback((id: string) => {
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((value) => value !== id);
            }
            return [...prev, id];
        });
    }, []);

    const allSelected =
        selectedIds.length === 0
            ? false
            : selectedIds.length === sorted.length
              ? true
              : "indeterminate";

    const toBatchDelete = async () => {
        await modal.prompt({
            title: t("batch-delete-confirm", {
                n: selectedIds.length,
            }),
        });
        setEnableSelect(false);
        await useLedgerStore.getState().removeBills(selectedIds);
        await runSearch(effectiveForm);
    };

    const toBatchEdit = async () => {
        const initial = selectedIds.reduce(
            (prev, id, index) => {
                const bill = sorted.find((value) => value.id === id);
                if (!bill) {
                    return prev;
                }
                if (index === 0) {
                    return {
                        type: bill.type,
                        categoryId: bill.categoryId,
                    };
                }
                return {
                    type: bill.type === prev.type ? bill.type : undefined,
                    categoryId:
                        bill.categoryId === prev.categoryId
                            ? bill.categoryId
                            : undefined,
                };
            },
            {
                type: undefined,
                categoryId: undefined,
            } as BatchEditOptions,
        );
        const edit = await showBatchEdit(initial);
        const updatedEntries = selectedIds
            .map((id) => {
                const bill = {
                    ...sorted.find((value) => value.id === id),
                } as Bill;
                if (!bill) {
                    return undefined;
                }
                if (edit.type !== undefined) {
                    const isTypeChanged = bill.type !== edit.type;
                    bill.type = edit.type;
                    if (edit.categoryId !== undefined) {
                        bill.categoryId = edit.categoryId;
                    } else if (isTypeChanged) {
                        const firstCategoryId = categories.find(
                            (category) => category.type === edit.type,
                        )?.id;
                        if (firstCategoryId) {
                            bill.categoryId = firstCategoryId;
                        }
                    }
                }
                if (edit.tagIds !== undefined) {
                    bill.tagIds = edit.tagIds;
                }
                return {
                    id: bill.id,
                    entry: bill,
                };
            })
            .filter((value) => value !== undefined);
        await useLedgerStore.getState().updateBills(updatedEntries);
        await runSearch(effectiveForm);
    };

    const showIdleState = searchState === "idle" && !hasCriteria;
    const showEmptyState =
        searchState === "complete" && hasCriteria && sorted.length === 0;
    const showSummaryRow = enableSelect || searchState === "complete";
    const searchSummaryTitle = enableSelect
        ? `${selectedIds.length}/${sorted.length}`
        : t("total-records", { n: sorted.length });
    const searchSummarySubtitle = enableSelect
        ? t("multi-select")
        : activeFilterCount > 0
          ? t("search-active-filters", { n: activeFilterCount })
          : t("search-results-live");
    const stateVariants = prefersReducedMotion
        ? reducedStateSurfaceVariants
        : stateSurfaceVariants;
    const stateTransition = prefersReducedMotion
        ? { duration: 0.16 }
        : surfaceTransition;
    const heroContainerVariants = prefersReducedMotion
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
                      delayChildren: 0.03,
                      staggerStep: 0.05,
                  }),
              },
          };
    const heroItemVariants = prefersReducedMotion
        ? reducedSectionEnterVariants
        : sectionEnterVariants;

    return (
        <div className="search-page relative w-full h-full p-2 pb-[calc(100px+env(safe-area-inset-bottom))] flex justify-center overflow-hidden">
            <Navigation />
            <div className="search-page-shell h-full w-full max-w-[720px] flex flex-col">
                <motion.div
                    {...getStageProps({
                        index: 0,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="search-hero-card"
                >
                    <motion.div
                        className="search-hero-content"
                        variants={heroContainerVariants}
                        initial="initial"
                        animate="animate"
                    >
                        <motion.div
                            className="search-input-surface"
                            variants={heroItemVariants}
                        >
                            <i className="icon-[mdi--magnify] size-5 text-foreground/60"></i>
                            <div className="flex-1">
                                <Clearable
                                    visible={Boolean(form.keyword?.length)}
                                    onClear={() =>
                                        setForm((prev) => ({
                                            ...prev,
                                            keyword: undefined,
                                        }))
                                    }
                                >
                                    <input
                                        value={form.keyword ?? ""}
                                        type="text"
                                        maxLength={80}
                                        className="search-input-field"
                                        placeholder={t(
                                            "search-comprehensive-placeholder",
                                        )}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setForm((prev) => ({
                                                ...prev,
                                                keyword: value || undefined,
                                            }));
                                        }}
                                    />
                                </Clearable>
                            </div>
                            {searchState === "searching" && (
                                <i className="icon-[mdi--loading] size-4 animate-spin text-primary"></i>
                            )}
                        </motion.div>
                        <motion.div
                            className="search-toolbar-row"
                            variants={heroItemVariants}
                        >
                            <motion.button
                                type="button"
                                className="search-chip"
                                whileHover={
                                    prefersReducedMotion
                                        ? undefined
                                        : microHover
                                }
                                whileTap={
                                    prefersReducedMotion
                                        ? undefined
                                        : microPress
                                }
                                transition={microInteractionTransition}
                                onClick={() => setFilterOpen((value) => !value)}
                            >
                                <i
                                    className={cn(
                                        filterOpen
                                            ? "icon-[mdi--tune-vertical]"
                                            : "icon-[mdi--tune]",
                                    )}
                                ></i>
                                {t("filter")}
                                {activeFilterCount > 0 && (
                                    <span className="search-chip-count">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </motion.button>
                            {hasCriteria && (
                                <motion.button
                                    type="button"
                                    className="search-chip search-chip-muted"
                                    whileHover={
                                        prefersReducedMotion
                                            ? undefined
                                            : microHover
                                    }
                                    whileTap={
                                        prefersReducedMotion
                                            ? undefined
                                            : microPress
                                    }
                                    transition={microInteractionTransition}
                                    onClick={toReset}
                                >
                                    <i className="icon-[mdi--refresh]"></i>
                                    {t("reset")}
                                </motion.button>
                            )}
                        </motion.div>
                    </motion.div>
                </motion.div>

                <motion.div
                    {...getStageProps({
                        index: 1,
                        reducedMotion: prefersReducedMotion,
                        y: 16,
                    })}
                >
                    <Collapsible.Root
                        open={filterOpen}
                        onOpenChange={setFilterOpen}
                        className="search-filter-shell"
                    >
                        <Collapsible.Content className="data-[state=open]:animate-collapse-open data-[state=closed]:animate-collapse-close data-[state=closed]:overflow-hidden">
                            <motion.div
                                initial={false}
                                animate={
                                    filterOpen
                                        ? { opacity: 1, y: 0 }
                                        : { opacity: 0, y: -8 }
                                }
                                transition={
                                    prefersReducedMotion
                                        ? { duration: 0.16 }
                                        : surfaceTransition
                                }
                            >
                                <BillFilterForm
                                    form={form}
                                    setForm={setForm}
                                    className="border-b-0"
                                    showComment
                                />
                            </motion.div>
                        </Collapsible.Content>
                        <div className="search-filter-actions">
                            <div className="search-filter-title">
                                {t("search-advanced-title")}
                                {activeFilterCount > 0 && (
                                    <span className="search-filter-count">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Collapsible.Trigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <i className="icon-[mdi--tune]"></i>
                                        {filterOpen
                                            ? t("collapse")
                                            : t("expand")}
                                    </Button>
                                </Collapsible.Trigger>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toReset}
                                >
                                    {t("reset")}
                                </Button>
                            </div>
                        </div>
                    </Collapsible.Root>
                </motion.div>

                {showSummaryRow && (
                    <motion.div
                        {...getStageProps({
                            index: 2,
                            reducedMotion: prefersReducedMotion,
                            y: 14,
                        })}
                        className={cn(
                            "search-summary-row",
                            enableSelect && "search-summary-row-select",
                        )}
                    >
                        <motion.div
                            layout="position"
                            className="search-summary-copy"
                            transition={surfaceTransition}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={`${searchSummaryTitle}-${searchSummarySubtitle}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={stateTransition}
                                >
                                    <div className="search-summary-title">
                                        {searchSummaryTitle}
                                    </div>
                                    <div className="search-summary-subtitle">
                                        {searchSummarySubtitle}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                        <AnimatePresence mode="wait" initial={false}>
                            {!enableSelect ? (
                                <motion.div
                                    key="search-summary-default"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={stateTransition}
                                    className="search-summary-actions"
                                >
                                    {sorted.length > 0 && (
                                        <Button
                                            className="search-action-button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEnableSelect(true);
                                            }}
                                        >
                                            <i className="icon-[mdi--checkbox-multiple-marked-outline]"></i>
                                            {t("multi-select")}
                                        </Button>
                                    )}
                                    {searchState === "complete" &&
                                        sorted.length > 0 && (
                                            <Button
                                                className="search-action-button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={toSaveFilter}
                                            >
                                                <i className="icon-[mdi--chart-box-outline]"></i>
                                                {t("save-for-analyze")}
                                            </Button>
                                        )}
                                    <Button
                                        className="search-action-button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSortIndex((current) =>
                                                current === SORTS.length - 1
                                                    ? 0
                                                    : current + 1,
                                            );
                                        }}
                                    >
                                        <i
                                            className={cn(
                                                SORTS[sortIndex].icon,
                                            )}
                                        ></i>
                                        {t(SORTS[sortIndex].label)}
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="search-summary-select"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={stateTransition}
                                    className="search-summary-actions"
                                >
                                    <Checkbox
                                        checked={allSelected}
                                        onClick={() => {
                                            if (allSelected === true) {
                                                setSelectedIds([]);
                                            } else {
                                                setSelectedIds(
                                                    sorted.map(
                                                        (bill) => bill.id,
                                                    ),
                                                );
                                            }
                                        }}
                                    />
                                    <Button
                                        className="search-action-button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={toBatchEdit}
                                        disabled={selectedIds.length === 0}
                                    >
                                        {t("edit")}
                                    </Button>
                                    <Button
                                        className="search-action-button text-destructive"
                                        variant="ghost"
                                        size="sm"
                                        onClick={toBatchDelete}
                                        disabled={selectedIds.length === 0}
                                    >
                                        {t("delete")}
                                    </Button>
                                    <Button
                                        className="search-action-button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEnableSelect(false);
                                            setSelectedIds([]);
                                        }}
                                    >
                                        {t("cancel")}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                <motion.div
                    {...getStageProps({
                        index: showSummaryRow ? 3 : 2,
                        reducedMotion: prefersReducedMotion,
                    })}
                    className="search-results-shell min-h-0 flex-1"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        {showIdleState ? (
                            <motion.div
                                key="search-idle"
                                variants={stateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={stateTransition}
                                className="search-empty-state"
                            >
                                <div className="search-empty-icon">
                                    <i className="icon-[mdi--magnify-scan] size-6"></i>
                                </div>
                                <div className="search-empty-title">
                                    {t("search-ready-title")}
                                </div>
                                <div className="search-empty-subtitle">
                                    {t("search-ready-tip")}
                                </div>
                            </motion.div>
                        ) : searchState === "searching" ? (
                            <motion.div
                                key="search-loading"
                                variants={stateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={stateTransition}
                                className="search-loading-state"
                            >
                                <Skeleton className="h-16 rounded-[18px]" />
                                <Skeleton className="h-16 rounded-[18px]" />
                                <Skeleton className="h-16 rounded-[18px]" />
                            </motion.div>
                        ) : showEmptyState ? (
                            <motion.div
                                key="search-empty"
                                variants={stateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={stateTransition}
                                className="search-empty-state"
                            >
                                <div className="search-empty-icon">
                                    <i className="icon-[mdi--text-box-search-outline] size-6"></i>
                                </div>
                                <div className="search-empty-title">
                                    {t("search-empty-title")}
                                </div>
                                <div className="search-empty-subtitle">
                                    {t("search-empty-tip")}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="search-results"
                                variants={stateVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={stateTransition}
                                className="h-full"
                            >
                                <Ledger
                                    bills={sorted}
                                    showTime
                                    selectedIds={
                                        enableSelect ? selectedIds : undefined
                                    }
                                    onSelectChange={onSelectChange}
                                    afterEdit={() => {
                                        void runSearch(effectiveForm);
                                    }}
                                    showAssets={showAssets}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
            <BatchEditProvider />
        </div>
    );
}
