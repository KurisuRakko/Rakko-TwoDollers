import { StorageAPI } from "@/api/storage";
import { useCreators, useCurrentUserDisplay } from "@/hooks/use-user-display";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import createConfirmProvider from "../confirm";
import { Button } from "../ui/button";
import UserAvatarImage from "../user-avatar";

function Form({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const {
        id,
        avatarSource: myAvatarSource,
        displayName: myDisplayName,
        originalName: myOriginalName,
    } = useCurrentUserDisplay();
    const { currentBookId } = useBookStore();
    const creators = useCreators();

    const canInvite = Boolean(StorageAPI.inviteForBook && currentBookId);

    return (
        <PopupLayout
            title={t("user-management")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="px-4 opacity-60 text-sm">{t("me")}</div>
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b">
                <div className="flex items-center gap-2">
                    <UserAvatarImage
                        source={myAvatarSource}
                        alt={myDisplayName}
                        className="w-12 h-12 rounded-full border object-cover"
                    />

                    <div>
                        <div className="font-semibold">{myDisplayName}</div>
                        {myDisplayName !== myOriginalName && (
                            <div className="text-sm opacity-60">
                                {t("original-account-name")}: {myOriginalName}
                            </div>
                        )}
                        <div className="text-sm opacity-60 truncate">{id}</div>
                    </div>
                </div>
            </div>
            <div className="px-4 opacity-60 text-sm pt-2 flex items-center justify-between gap-2">
                <span>{t("collaborators")}</span>
                {canInvite && (
                    <Button
                        size={"sm"}
                        variant={"secondary"}
                        onClick={() => {
                            if (currentBookId) {
                                StorageAPI.inviteForBook?.(currentBookId);
                            }
                        }}
                    >
                        <i className="icon-[mdi--account-plus-outline]" />
                        {t("invite")}
                    </Button>
                )}
            </div>
            <div className="divide-y divide-solid flex flex-col overflow-hidden gap-2">
                {creators
                    .filter((u) => u.id !== id)
                    .map((user) => {
                        return (
                            <div
                                key={user.id}
                                className="flex items-center justify-between gap-2 px-4 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <UserAvatarImage
                                        source={user.avatarSource}
                                        alt={user.displayName}
                                        className="w-12 h-12 rounded-full border object-cover"
                                    />

                                    <div>
                                        <div className="font-semibold">
                                            {user.displayName}
                                        </div>
                                        {user.displayName !==
                                            user.originalName && (
                                            <div className="text-sm opacity-60">
                                                {t("original-account-name")}:{" "}
                                                {user.originalName}
                                            </div>
                                        )}
                                        <div className="text-sm opacity-60">
                                            {user.id}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </PopupLayout>
    );
}

const [UserSettingsProvider, showUserSettings] = createConfirmProvider(Form, {
    dialogTitle: "user-management",
    dialogModalClose: true,
    contentClassName:
        "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[55vh] sm:w-[90vw] sm:max-w-[500px]",
});

export default function UserSettingsItem() {
    const t = useIntl();
    return (
        <div className="lab">
            <Button
                onClick={() => {
                    showUserSettings();
                }}
                variant="ghost"
                className="w-full py-4 rounded-none h-auto"
            >
                <div className="w-full px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--account-supervisor-outline] size-5"></i>
                        {t("user-management")}
                    </div>
                    <i className="icon-[mdi--chevron-right] size-5"></i>
                </div>
            </Button>
            <UserSettingsProvider />
        </div>
    );
}
