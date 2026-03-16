/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import useCategory from "@/hooks/use-category";
import { useCreators } from "@/hooks/use-creator";
import { useCurrency } from "@/hooks/use-currency";
import { useScheduled } from "@/hooks/use-scheduled";
import { useTag } from "@/hooks/use-tag";
import { amountToNumber } from "@/ledger/bill";
import { useIntl } from "@/locale";
import { useGuideStore } from "@/store/guide";
import { type EditBill, useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import { formatTime } from "@/utils/time";
import { showBillEditor } from "../bill-editor";
import CategoryIcon from "../category/icon";
import SmartImage from "../image";
import Money from "../money";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "../ui/dropdown-menu";

export default function BillInfo({
    edit,
    onConfirm,
    onCancel,
}: {
    edit?: EditBill;
    onConfirm?: (isEdit: boolean) => void;
    onCancel?: () => void;
}) {
    const t = useIntl();
    const { id: curUserId } = useUserStore();
    const { categories } = useCategory();
    const { baseCurrency, allCurrencies } = useCurrency();

    const creators = useCreators();
    const creator = creators.find((c) => c.id === edit?.creatorId);
    const { tags: allTags } = useTag();
    const tags = edit?.tagIds
        ?.map((id) => allTags.find((t) => t.id === id))
        .filter((v) => v !== undefined);
    const { name, id } = creator ?? { name: undefined, id: undefined };
    const { id: selfId } = useUserStore();
    const isMe = id === selfId;

    const { scheduleds } = useScheduled();

    if (!edit) {
        return null;
    }
    const categoryInfo = categories.find((c) => c.id === edit.categoryId);
    const canEdit =
        edit.creatorId === curUserId ||
        creators.every((c) => c.id !== edit.creatorId);

    const toEdit = async () => {
        if (edit?.id) {
            const newBill = await showBillEditor(edit);
            await useLedgerStore.getState().updateBill(edit.id, newBill);
            onConfirm?.(true);
        }
    };

    // more actions
    const toDuplicate = async () => {
        if (edit?.id) {
            await useLedgerStore
                .getState()
                .addBill({ ...edit, time: Date.now() });
            onConfirm?.(true);
        }
    };
    const toSplit = async () => {
        if (edit?.id) {
            if (!useGuideStore.getState().splitBillTipShows) {
                toast.info(t("split-action-tip"));
                useGuideStore.setState((prev) => ({
                    ...prev,
                    splitBillTipShows: true,
                }));
            }
            const newBill = await showBillEditor(edit);
            await Promise.all([
                useLedgerStore.getState().addBill({ ...newBill }),
                useLedgerStore.getState().updateBill(edit.id, {
                    ...edit,
                    amount: edit.amount - newBill.amount,
                    // 涉及多币种时默认币种相同，直接相减
                    currency:
                        edit.currency === undefined
                            ? undefined
                            : {
                                  ...edit.currency,
                                  amount:
                                      edit.currency.amount -
                                      (newBill.currency?.amount ?? 0),
                              },
                }),
            ]);
            onConfirm?.(true);
        }
    };
    const toDelete = async () => {
        if (edit?.id) {
            await useLedgerStore.getState().removeBill(edit?.id);
            onConfirm?.(false);
        }
    };

    const toClose = () => {
        onCancel?.();
    };

    const currency =
        edit.currency?.target === baseCurrency.id
            ? undefined
            : allCurrencies.find((c) => c.id === edit.currency?.target);

    const schedule = edit.extra?.scheduledId
        ? scheduleds.find((v) => v.id === edit.extra?.scheduledId)
        : undefined;
    return (
        <div className="bill-info-shell">
            <div className="bill-info-panel min-h-[320px] p-4 flex flex-col w-full h-full">
                <div className="flex-1 flex flex-col">
                    {/* header */}
                    <div className="bill-info-header flex items-center justify-between gap-3">
                        <div className="flex items-center">
                            <div className="bill-info-icon w-12 h-12 flex-shrink-0 rounded-full p-4 flex items-center justify-center">
                                {categoryInfo?.icon && (
                                    <CategoryIcon icon={categoryInfo?.icon} />
                                )}
                            </div>
                            <div className="flex text-md font-semibold px-2 text-foreground">
                                <div>{categoryInfo?.name ?? ""}</div>
                            </div>
                        </div>
                        <div
                            className={`text-2xl font-bold flex overflow-x-auto ${
                                edit.type === "expense"
                                    ? "text-semantic-expense"
                                    : "text-semantic-income"
                            }`}
                        >
                            <div>{edit.type === "expense" ? "-" : "+"}</div>
                            <Money
                                value={amountToNumber(edit.amount)}
                                accurate
                            />
                        </div>
                    </div>

                    <div className="bill-info-divider w-full my-3"></div>

                    {/* details */}
                    <div className="bill-info-meta">
                        <div className="bill-info-row flex justify-between items-center my-1 gap-2">
                            <div>{t("comment")}:</div>
                            <div className="bill-info-value flex-1 overflow-x-auto text-right">
                                {edit.comment}
                            </div>
                        </div>
                        <div className="bill-info-row flex justify-between items-center my-1 gap-2">
                            <div>{t("creator")}:</div>
                            <div className="bill-info-value">
                                {isMe ? t("me") : name}
                            </div>
                        </div>
                        <div className="bill-info-row flex justify-between items-center my-1 gap-2">
                            <div>{t("time")}:</div>
                            <div className="bill-info-value">
                                {formatTime(edit.time)}
                            </div>
                        </div>
                        {currency !== undefined && (
                            <div className="bill-info-row flex justify-between items-center my-1 gap-2">
                                <div>{t("currency")}:</div>
                                <div className="bill-info-value">
                                    {currency.symbol}
                                    {amountToNumber(edit.currency!.amount)}{" "}
                                    {currency.label}
                                </div>
                            </div>
                        )}
                        {(tags?.length ?? 0) > 0 && (
                            <div className="bill-info-row flex justify-between items-start my-1">
                                <div>{t("tags")}:</div>
                                <div className="bill-info-value flex flex-wrap gap-1 justify-end max-w-[80%]">
                                    {tags?.map((t) => (
                                        <span key={t.id}>#{t.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {edit.images && (
                        <div className="flex-1 py-2 flex gap-2 items-center justify-center max-w-full overflow-x-auto hidden-scrollbar">
                            {edit.images.map((img, i) => (
                                <SmartImage
                                    key={i}
                                    source={img}
                                    alt=""
                                    className="max-h-[200px] object-cover rounded min-w-24 min-h-24 data-[state=loading]:animate-pulse bg-primary/10"
                                />
                            ))}
                        </div>
                    )}

                    {edit.extra?.scheduledId && (
                        <div className="text-xs opacity-60 text-right">
                            {t("from-scheduled")} {schedule?.title}
                        </div>
                    )}
                </div>

                {/* footer */}
                <div className="bill-info-footer footer flex justify-between items-center gap-3">
                    <div className="flex">
                        {canEdit && (
                            <MoreAction
                                onDelete={toDelete}
                                onDuplicate={toDuplicate}
                                onSplit={toSplit}
                            />
                        )}
                    </div>
                    <div className="flex">
                        <button
                            type="button"
                            className="bill-info-action buttoned px-2 rounded-md cursor-pointer"
                            onClick={toClose}
                        >
                            {t("cancel")}
                        </button>
                        {canEdit && (
                            <button
                                type="button"
                                className="bill-info-action bill-info-action-primary buttoned ml-2 px-2 rounded-md font-semibold cursor-pointer"
                                onClick={toEdit}
                            >
                                {t("edit")}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MoreAction({
    onDelete,
    onSplit,
    onDuplicate,
}: {
    onDelete?: () => void;
    onSplit?: () => void;
    onDuplicate?: () => void;
}) {
    const t = useIntl();
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={"ghost"}
                    className="bill-info-action text-base font-normal cursor-pointer"
                >
                    {t("more-actions")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={10}
                className="bill-info-more-menu"
            >
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={onDuplicate}>
                        <i className="icon-[mdi--content-copy]"></i>
                        {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSplit}>
                        <i className="icon-[mdi--format-page-split]"></i>
                        {t("split-action")}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={onDelete}
                    >
                        <i className="icon-[mdi--trash-can-outline]"></i>
                        {t("delete")}
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
