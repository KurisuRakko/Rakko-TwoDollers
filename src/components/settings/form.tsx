import { useCurrentUserDisplay } from "@/hooks/use-user-display";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import TagSettingsItem from "../bill-tag";
import { BookSettings } from "../book";
import Budget from "../budget";
import CategorySettingsItem from "../category";
import CurrencySettingsItem from "../currency";
import DataManagerSettingsItem from "../data-manager";
import ScheduledSettingsItems from "../scheduled/settings-item";
import UserAvatarImage from "../user-avatar";
import AboutSettingsItem, { AdvancedGuideItem } from "./about";
import LabSettingsItem from "./lab";
import LanguageSettingsItem from "./language";
import ThemeSettingsItem from "./theme";
import UserSettingsItem from "./user";
import { showUserCenter } from "./user-center";
import WallpaperSettingsItem from "./wallpaper";

function UserInfo() {
    const t = useIntl();
    const { id, avatarSource, displayName, originalName, expired } =
        useCurrentUserDisplay();

    return (
        <div className="px-8 py-4">
            <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border bg-background/72 px-4 py-4 text-left shadow-sm transition-colors hover:bg-accent/30"
                onClick={() => {
                    showUserCenter();
                }}
            >
                <UserAvatarImage
                    source={avatarSource}
                    alt={displayName}
                    className="h-14 w-14 flex-shrink-0 rounded-full border object-cover"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-xs opacity-60">{t("user-center")}</div>
                    <div className="font-semibold truncate">{displayName}</div>
                    {displayName !== originalName && (
                        <div className="text-sm opacity-60 truncate">
                            {t("original-account-name")}: {originalName}
                        </div>
                    )}
                    <div className="text-sm opacity-60 truncate">{id}</div>
                </div>
                {expired && (
                    <div className="rounded border px-2 py-1 text-xs text-orange-600">
                        {t("re-login")}
                    </div>
                )}
                <i className="icon-[mdi--chevron-right] size-5 flex-shrink-0 opacity-60" />
            </button>
        </div>
    );
}

export default function SettingsForm({
    onCancel,
}: {
    onConfirm?: (isEdit: boolean) => void;
    onCancel?: () => void;
}) {
    const t = useIntl();

    return (
        <PopupLayout
            onBack={onCancel}
            title={t("settings")}
            className="h-full overflow-hidden"
        >
            <div className="divide-y divide-solid flex flex-col overflow-hidden">
                <UserInfo />
                <div className="flex-1 overflow-y-auto flex flex-col py-4">
                    <div>
                        <div className="text-xs opacity-60 px-8">
                            {t("book-settings")}
                        </div>
                        <div className="flex flex-col divide-y">
                            <BookSettings />
                            <UserSettingsItem />
                            <DataManagerSettingsItem />
                        </div>
                    </div>

                    <div>
                        <div className="text-xs opacity-60 px-8">
                            {t("billing-functions")}
                        </div>
                        <div className="flex flex-col divide-y">
                            <CategorySettingsItem />
                            <TagSettingsItem />
                            <Budget />
                            <ScheduledSettingsItems />
                            <CurrencySettingsItem />
                        </div>
                    </div>

                    <div>
                        <div className="text-xs opacity-60 px-8">
                            {t("other-settings")}
                        </div>
                        <div className="flex flex-col divide-y">
                            <ThemeSettingsItem />
                            <WallpaperSettingsItem />
                            <LabSettingsItem />
                            <AboutSettingsItem />
                            <LanguageSettingsItem />
                            <AdvancedGuideItem />
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    );
}
