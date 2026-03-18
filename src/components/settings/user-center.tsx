import { StorageAPI } from "@/api/storage";
import { useCurrentUserDisplay } from "@/hooks/use-user-display";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useLedgerStore } from "@/store/ledger";
import {
    normalizeUserAvatarSource,
    normalizeUserDisplayName,
} from "@/utils/user-display";
import createConfirmProvider from "../confirm";
import modal from "../modal";
import { Button } from "../ui/button";
import UserAvatarImage from "../user-avatar";
import { AvatarEditorProvider, showAvatarEditor } from "./avatar-editor";

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const { currentBookId } = useBookStore();
    const {
        id,
        avatarSource,
        displayName,
        originalName,
        expired,
        hasCustomAvatar,
    } = useCurrentUserDisplay();

    const toLogOut = async () => {
        await modal.prompt({ title: t("logout-warning") });

        const [close] = modal.loading({
            label: t("clearing-data"),
        });

        try {
            await StorageAPI.toSync();
        } catch (error) {
            console.error(error);
        }

        await StorageAPI.clearAll();
        close();
        location.reload();
    };

    const toEditDisplayName = async () => {
        const nextValue = await modal
            .prompt({
                title: (
                    <div className="flex flex-col gap-1">
                        <div className="font-semibold">
                            {t("edit-shared-display-name")}
                        </div>
                        <div className="text-sm opacity-60">
                            {t("shared-display-name-tip")}
                        </div>
                    </div>
                ),
                input: {
                    type: "text",
                    defaultValue: displayName,
                    placeholder: originalName,
                    maxLength: 50,
                },
            })
            .catch(() => undefined);

        if (nextValue === undefined) {
            return;
        }

        const normalized = normalizeUserDisplayName(`${nextValue}`);
        await useLedgerStore.getState().updateGlobalMeta((prev) => {
            const nextNames = {
                ...(prev.userDisplayNames ?? {}),
            };

            if (normalized && normalized !== originalName) {
                nextNames[`${id}`] = normalized;
            } else {
                delete nextNames[`${id}`];
            }

            return {
                ...prev,
                userDisplayNames:
                    Object.keys(nextNames).length > 0 ? nextNames : undefined,
            };
        });
    };

    const toEditAvatar = async () => {
        const result = await showAvatarEditor({
            currentAvatar: avatarSource,
            displayName,
            canReset: hasCustomAvatar,
        }).catch(() => undefined);

        if (!result) {
            return;
        }

        if (result.type === "reset") {
            await useLedgerStore.getState().updateGlobalMeta((prev) => {
                const nextAvatars = {
                    ...(prev.userAvatars ?? {}),
                };

                delete nextAvatars[`${id}`];

                return {
                    ...prev,
                    userAvatars:
                        Object.keys(nextAvatars).length > 0
                            ? nextAvatars
                            : undefined,
                };
            });
            modal.toast.success(t("avatar-reset-success"));
            return;
        }

        if (!currentBookId) {
            modal.toast.error(t("something-wrong-please-try-again"));
            return;
        }

        const [close] = modal.loading({
            label: t("avatar-saving"),
        });

        try {
            const source = await StorageAPI.uploadUserAvatar(
                currentBookId,
                `${id}`,
                result.file,
            );
            const normalized = normalizeUserAvatarSource(source);
            if (!normalized) {
                throw new Error("empty avatar source");
            }

            await useLedgerStore.getState().updateGlobalMeta((prev) => {
                const nextAvatars = {
                    ...(prev.userAvatars ?? {}),
                    [`${id}`]: normalized,
                };
                return {
                    ...prev,
                    userAvatars: nextAvatars,
                };
            });
            modal.toast.success(t("avatar-saved"));
        } catch (error) {
            console.error(error);
            modal.toast.error(t("something-wrong-please-try-again"));
        } finally {
            close();
        }
    };

    return (
        <>
            <PopupLayout
                title={t("user-center")}
                onBack={onCancel}
                className="h-full overflow-hidden"
            >
                <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
                    <div className="rounded-[28px] border bg-background/76 p-5 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                className="relative flex-shrink-0 overflow-hidden rounded-full transition-transform hover:scale-[1.02]"
                                onClick={toEditAvatar}
                                title={t("edit-avatar")}
                            >
                                <UserAvatarImage
                                    source={avatarSource}
                                    alt={displayName}
                                    className="size-20 rounded-full border object-cover"
                                />
                                <div className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border bg-background/92 shadow-sm">
                                    <i className="icon-[mdi--camera-outline] size-3.5" />
                                </div>
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="text-xs opacity-60">
                                    {t("user-center")}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="truncate text-xl font-semibold">
                                        {displayName}
                                    </div>
                                    <div
                                        className="flex-shrink-0"
                                        title={`Signed with ${StorageAPI.name}`}
                                    >
                                        <div className="rounded border px-1 text-xs">
                                            {StorageAPI.name}
                                        </div>
                                    </div>
                                </div>
                                {displayName !== originalName && (
                                    <div className="text-sm opacity-60 truncate">
                                        {t("original-account-name")}:{" "}
                                        {originalName}
                                    </div>
                                )}
                                <div className="text-sm opacity-60 truncate">
                                    {id}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border bg-background/76 shadow-sm backdrop-blur-sm">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/30"
                            onClick={toEditAvatar}
                        >
                            <div className="min-w-0">
                                <div className="font-medium">
                                    {t("edit-avatar")}
                                </div>
                                <div className="text-sm opacity-60">
                                    {t("avatar-settings")}
                                </div>
                            </div>
                            <i className="icon-[mdi--chevron-right] size-5 opacity-60" />
                        </button>

                        <div className="mx-4 border-t" />

                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/30"
                            onClick={toEditDisplayName}
                        >
                            <div className="min-w-0">
                                <div className="font-medium">
                                    {t("shared-display-name")}
                                </div>
                                <div className="text-sm opacity-60 truncate">
                                    {displayName}
                                </div>
                            </div>
                            <i className="icon-[mdi--chevron-right] size-5 opacity-60" />
                        </button>
                    </div>

                    <div className="rounded-[24px] border bg-background/76 p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex flex-col gap-2">
                            {expired && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        StorageAPI.loginWith(StorageAPI.type);
                                    }}
                                >
                                    <i className="icon-[mdi--reload]"></i>
                                    {t("re-login")}
                                </Button>
                            )}
                            <Button variant="destructive" onClick={toLogOut}>
                                {t("logout")}
                            </Button>
                        </div>
                    </div>
                </div>
            </PopupLayout>
            <AvatarEditorProvider />
        </>
    );
}

const [UserCenterProvider, showUserCenter] = createConfirmProvider(Form, {
    dialogTitle: "user-center",
    dialogModalClose: true,
    contentClassName:
        "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[70vh] sm:w-[90vw] sm:max-w-[520px]",
});

export { UserCenterProvider, showUserCenter };
