import { Switch } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useCategory from "@/hooks/use-category";
import { useCurrency } from "@/hooks/use-currency";
import { useTag } from "@/hooks/use-tag";
import { useWheelScrollX } from "@/hooks/use-wheel-scroll";
import PopupLayout from "@/layouts/popup-layout";
import { amountToNumber, numberToAmount } from "@/ledger/bill";
import { ExpenseBillCategories, IncomeBillCategories } from "@/ledger/category";
import type { Bill } from "@/ledger/type";
import { categoriesGridClassName } from "@/ledger/utils";
import { useIntl, useLocale } from "@/locale";
import type { EditBill } from "@/store/ledger";
import { usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import { showTagList } from "../bill-tag";
import { showCategoryList } from "../category";
import { CategoryItem } from "../category/item";
import { DatePicker } from "../date-picker";
import Deletable from "../deletable";
import { FORMAT_IMAGE_SUPPORTED, showFilePicker } from "../file-picker";
import SmartImage from "../image";
import IOSUnscrolledInput from "../input";
import Calculator from "../keyboard";
import Tag from "../tag";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { goAddBill } from ".";
import { RemarkHint } from "./remark";
import TagGroupSelector from "./tag-group";

const defaultBill = {
    type: "expense" as Bill["type"],
    comment: "",
    amount: 0,
    categoryId: ExpenseBillCategories[0].id,
};

export default function EditorForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: EditBill;
    onConfirm?: (v: Omit<Bill, "id" | "creatorId">) => void;
    onCancel?: () => void;
}) {
    const t = useIntl();
    const isCreate = edit === undefined;
    const goBack = () => {
        onCancel?.();
    };

    const { baseCurrency, convert, quickCurrencies, allCurrencies } =
        useCurrency();

    const { incomes, expenses } = useCategory();

    const [billState, setBillState] = useState(() => {
        const init = {
            ...defaultBill,
            categoryId: defaultBill.categoryId,
            time: Date.now(),
            ...edit,
        };
        if (edit?.currency?.target === baseCurrency.id) {
            delete init.currency;
        }
        return init;
    });

    const { grouped } = useTag();

    const categories = billState.type === "expense" ? expenses : incomes;

    const subCategories = useMemo(() => {
        const selected = categories.find(
            (c) =>
                c.id === billState.categoryId ||
                c.children.some((s) => s.id === billState.categoryId),
        );
        if (selected?.children) {
            return selected.children;
        }
        return categories.find((c) => c.id === selected?.parent)?.children;
    }, [billState.categoryId, categories]);

    const toConfirm = useCallback(() => {
        onConfirm?.({
            ...billState,
        });
    }, [onConfirm, billState]);

    const chooseImage = async () => {
        const [file] = await showFilePicker({ accept: FORMAT_IMAGE_SUPPORTED });
        setBillState((v) => {
            return { ...v, images: [...(v.images ?? []), file] };
        });
    };

    const monitorRef = useRef<HTMLButtonElement>(null);
    const [monitorFocused, setMonitorFocused] = useState(false);
    useEffect(() => {
        monitorRef.current?.focus?.();
    }, []);

    useEffect(() => {
        if (monitorFocused) {
            const onPress = (event: KeyboardEvent) => {
                const key = event.key;
                if (key === "Enter") {
                    toConfirm();
                }
            };
            document.addEventListener("keypress", onPress);
            return () => {
                document.removeEventListener("keypress", onPress);
            };
        }
    }, [monitorFocused, toConfirm]);

    const targetCurrency =
        allCurrencies.find(
            (c) => c.id === (billState.currency?.target ?? baseCurrency.id),
        ) ?? baseCurrency;

    const changeCurrency = (newCurrencyId: string) =>
        setBillState((prev) => {
            if (newCurrencyId === baseCurrency.id) {
                return {
                    ...prev,
                    amount: prev.currency?.amount ?? prev.amount,
                    currency: undefined,
                };
            }
            const { predict } = convert(
                amountToNumber(prev.currency?.amount ?? prev.amount),
                newCurrencyId,
                baseCurrency.id,
                prev.time,
            );
            return {
                ...prev,
                amount: numberToAmount(predict),
                currency: {
                    base: baseCurrency.id,
                    target: newCurrencyId,
                    amount: prev.currency?.amount ?? prev.amount,
                },
            };
        });

    const calculatorInitialValue = billState?.currency
        ? amountToNumber(billState.currency.amount)
        : billState?.amount
          ? amountToNumber(billState?.amount)
          : 0;

    const multiplyKey = usePreferenceStore((v) => {
        if (!v.multiplyKey || v.multiplyKey === "off") {
            return undefined;
        }
        if (v.multiplyKey === "double-zero") {
            return "double-zero";
        }
        return "triple-zero";
    });

    const tagSelectorRef = useRef<HTMLDivElement>(null);
    useWheelScrollX(tagSelectorRef);
    return (
        <Calculator.Root
            multiplyKey={multiplyKey}
            initialValue={calculatorInitialValue}
            onValueChange={(n) => {
                setBillState((v) => {
                    if (v.currency) {
                        const { predict } = convert(
                            n,
                            v.currency.target,
                            v.currency.base,
                            v.time,
                        );
                        return {
                            ...v,
                            amount: numberToAmount(predict),
                            currency: {
                                ...v.currency,
                                amount: numberToAmount(n),
                            },
                        };
                    }
                    return {
                        ...v,
                        amount: numberToAmount(n),
                    };
                });
            }}
            input={monitorFocused}
        >
            <PopupLayout
                className="editor-popup h-full gap-3 overflow-hidden scrollbar-hidden"
                onBack={goBack}
                title={
                    <div className="editor-header-shell pl-[54px] w-full min-h-12 rounded-lg flex pt-2 pb-0 overflow-hidden scrollbar-hidden">
                        <div>
                            <Switch.Root
                                className="editor-type-switch w-24 h-12 relative rounded-2xl p-1 flex justify-center items-center"
                                checked={billState.type === "income"}
                                onCheckedChange={() => {
                                    setBillState((v) => ({
                                        ...v,
                                        type:
                                            v.type === "expense"
                                                ? "income"
                                                : "expense",
                                        categoryId:
                                            v.type === "expense"
                                                ? IncomeBillCategories[0].id
                                                : ExpenseBillCategories[0].id,
                                    }));
                                }}
                            >
                                <Switch.Thumb className="editor-type-thumb w-1/2 h-full flex justify-center items-center transition-all rounded-xl bg-semantic-expense -translate-x-[22px] data-[state=checked]:bg-semantic-income data-[state=checked]:translate-x-[21px]">
                                    <span className="text-[9px] font-semibold">
                                        {billState.type === "expense"
                                            ? t("expense")
                                            : t("income")}
                                    </span>
                                </Switch.Thumb>
                            </Switch.Root>
                        </div>
                        <div className="editor-amount-surface flex-1 flex focus:outline rounded-2xl ml-2 px-3 relative">
                            {quickCurrencies.length > 0 && (
                                <Select
                                    value={targetCurrency?.id}
                                    onValueChange={(newCurrencyId) => {
                                        changeCurrency(newCurrencyId);
                                    }}
                                >
                                    <div className="flex items-center">
                                        <SelectTrigger className="w-fit outline-none ring-none border-none shadow-none p-0 [&_svg]:hidden">
                                            <div className="flex items-center font-semibold text-2xl text-foreground">
                                                {targetCurrency?.symbol}
                                            </div>
                                        </SelectTrigger>
                                    </div>
                                    <SelectContent>
                                        {quickCurrencies.map((currency) => (
                                            <SelectItem
                                                key={currency.id}
                                                value={currency.id}
                                            >
                                                {currency.label}
                                                {`(${currency.symbol})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <button
                                ref={monitorRef}
                                type="button"
                                onFocus={() => {
                                    setMonitorFocused(true);
                                }}
                                onBlur={() => {
                                    setMonitorFocused(false);
                                }}
                                className="flex-1 flex flex-col justify-center items-end overflow-x-scroll outline-none"
                            >
                                {billState.currency && (
                                    <div className="absolute text-muted-foreground text-[9px] top-1">
                                        ≈ {baseCurrency.symbol}{" "}
                                        {amountToNumber(billState.amount)}{" "}
                                        {baseCurrency.label}
                                    </div>
                                )}
                                <Calculator.Value
                                    className={cn(
                                        "text-foreground text-3xl font-semibold text-right bg-transparent after:inline-block after:content-['|'] after:opacity-0 after:font-thin after:translate-y-[-3px] ",
                                        monitorFocused &&
                                            "after:animate-caret-blink",
                                    )}
                                ></Calculator.Value>
                                {billState.amount < 0 && (
                                    <div className="absolute text-destructive text-[9px] bottom-1">
                                        {t("bill-negative-tip")}
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                }
            >
                {/* categories */}
                <div className="editor-category-shell flex-shrink overflow-y-auto min-h-[80px] scrollbar-hidden flex flex-col px-2 text-sm font-medium gap-2">
                    <div className="editor-category-panel flex flex-col min-h-[80px] shrink overflow-y-auto scrollbar-hidden w-full">
                        <div
                            className={cn(
                                "grid gap-1",
                                categoriesGridClassName(categories),
                            )}
                        >
                            {categories.map((item) => (
                                <CategoryItem
                                    key={item.id}
                                    category={item}
                                    selected={billState.categoryId === item.id}
                                    onMouseDown={() => {
                                        setBillState((v) => ({
                                            ...v,
                                            categoryId: item.id,
                                        }));
                                    }}
                                />
                            ))}
                            <button
                                type="button"
                                className="editor-chip-button rounded-xl border flex-1 py-1 px-2 h-10 flex gap-2 items-center justify-center whitespace-nowrap cursor-pointer"
                                onClick={() => {
                                    showCategoryList(billState.type);
                                }}
                            >
                                <i className="icon-[mdi--settings]"></i>
                                {t("edit")}
                            </button>
                        </div>
                    </div>
                    {(subCategories?.length ?? 0) > 0 && (
                        <div className="editor-subcategory-panel flex flex-col min-h-[68px] shrink max-h-fit overflow-y-auto rounded-2xl p-2 scrollbar-hidden">
                            <div
                                className={cn(
                                    "grid gap-1",
                                    categoriesGridClassName(subCategories),
                                )}
                            >
                                {subCategories?.map((subCategory) => {
                                    return (
                                        <CategoryItem
                                            key={subCategory.id}
                                            category={subCategory}
                                            selected={
                                                billState.categoryId ===
                                                subCategory.id
                                            }
                                            onMouseDown={() => {
                                                setBillState((v) => ({
                                                    ...v,
                                                    categoryId: subCategory.id,
                                                }));
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                {/* tags */}
                <div
                    ref={tagSelectorRef}
                    className="editor-tag-row w-full min-h-[48px] flex-shrink-0 flex-grow-0 flex gap-1 py-2 items-center overflow-x-auto px-2 text-sm font-medium scrollbar-hidden"
                >
                    <TagGroupSelector
                        isCreate={isCreate}
                        selectedTags={billState.tagIds}
                        onSelectChange={(newTagIds, extra) => {
                            setBillState((prev) => ({
                                ...prev,
                                tagIds: newTagIds,
                            }));
                            if (extra?.preferCurrency) {
                                changeCurrency(extra.preferCurrency);
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="editor-chip-button rounded-xl border py-1 px-3 h-10 flex gap-2 items-center justify-center whitespace-nowrap cursor-pointer"
                        onClick={() => {
                            showTagList();
                        }}
                    >
                        <i className="icon-[mdi--tag-text-outline]"></i>
                        {t("edit-tags")}
                    </button>
                </div>

                {/* keyboard area */}
                <div
                    className={cn(
                        "h-[calc(480px+160px*(var(--bekh,0.5)-0.5))] sm:h-[calc(380px+160px*(var(--bekh,0.5)-0.5))] min-h-[264px] max-h-[calc(100%-124px)]",
                        "editor-keyboard-shell keyboard-field flex gap-3 flex-col justify-start sm:rounded-b-[24px] p-3 pb-[max(env(safe-area-inset-bottom),12px)] mt-auto",
                    )}
                >
                    <div className="editor-meta-bar flex justify-between items-center">
                        <div className="flex gap-2 items-center h-10">
                            <div className="flex items-center h-full">
                                {(billState.images?.length ?? 0) > 0 && (
                                    <div className="pr-2 flex gap-[6px] items-center overflow-x-auto max-w-22 h-full scrollbar-hidden">
                                        {billState.images?.map((img, index) => (
                                            <Deletable
                                                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                                                key={index}
                                                onDelete={() => {
                                                    setBillState((v) => ({
                                                        ...v,
                                                        images: v.images?.filter(
                                                            (m) => m !== img,
                                                        ),
                                                    }));
                                                }}
                                            >
                                                <SmartImage
                                                    source={img}
                                                    alt=""
                                                    className="w-6 h-6 object-cover rounded"
                                                />
                                            </Deletable>
                                        ))}
                                    </div>
                                )}
                                {(billState.images?.length ?? 0) < 3 && (
                                    <button
                                        type="button"
                                        className="editor-meta-button px-2 flex justify-center items-center rounded-full transition-all cursor-pointer"
                                        onClick={chooseImage}
                                    >
                                        <i className="icon-xs icon-[mdi--image-plus-outline]"></i>
                                    </button>
                                )}
                            </div>
                            <div className="editor-meta-button rounded-full transition-all">
                                <DatePicker
                                    fixedTime
                                    value={billState.time}
                                    onChange={(time) => {
                                        setBillState((prev) => {
                                            if (!prev.currency) {
                                                return {
                                                    ...prev,
                                                    time: time,
                                                };
                                            }
                                            const { predict } = convert(
                                                amountToNumber(
                                                    prev.currency?.amount ??
                                                        prev.amount,
                                                ),
                                                prev.currency.target,
                                                baseCurrency.id,
                                                time,
                                            );
                                            return {
                                                ...prev,
                                                time: time,
                                                amount: numberToAmount(predict),
                                                currency: {
                                                    base: baseCurrency.id,
                                                    target: prev.currency
                                                        .target,
                                                    amount:
                                                        prev.currency?.amount ??
                                                        prev.amount,
                                                },
                                            };
                                        });
                                    }}
                                />
                            </div>
                        </div>
                        <RemarkHint
                            onSelect={(v) => {
                                setBillState((prev) => ({
                                    ...prev,
                                    comment: `${prev.comment} ${v}`,
                                }));
                            }}
                        >
                            <div className="flex h-full flex-1">
                                <IOSUnscrolledInput
                                    value={billState.comment}
                                    onChange={(e) => {
                                        setBillState((v) => ({
                                            ...v,
                                            comment: e.target.value,
                                        }));
                                    }}
                                    type="text"
                                    className="editor-comment-input w-full bg-transparent text-right outline-none"
                                    placeholder={t("comment")}
                                    enterKeyHint="done"
                                />
                            </div>
                        </RemarkHint>
                    </div>

                    <button
                        type="button"
                        className="editor-confirm-button flex h-[72px] min-h-[48px] justify-center items-center rounded-2xl font-bold text-lg cursor-pointer"
                        onClick={toConfirm}
                    >
                        <i className="icon-[mdi--check] icon-md"></i>
                    </button>
                    <Calculator.Keyboard
                        className={cn("flex-1")}
                        onKey={(v) => {
                            if (v === "r") {
                                toConfirm();
                                setTimeout(() => {
                                    goAddBill();
                                }, 10);
                            }
                        }}
                    />
                </div>
            </PopupLayout>
        </Calculator.Root>
    );
}
