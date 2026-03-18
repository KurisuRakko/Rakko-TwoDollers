import type { UserInfo } from "@/api/endpoints/type";
import type { GlobalMeta } from "@/ledger/type";

export const DEFAULT_OFFLINE_USER_NAME = "Mikaela Hyakuya";
export const DEFAULT_USER_AVATAR = "/icon.png";

type UserDisplayNameMap = GlobalMeta["userDisplayNames"];
type UserAvatarMap = GlobalMeta["userAvatars"];

export const normalizeUserDisplayName = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
};

export const normalizeUserAvatarSource = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
};

export const resolveUserDisplayName = ({
    userId,
    originalName,
    userDisplayNames,
}: {
    userId?: UserInfo["id"] | number;
    originalName?: string;
    userDisplayNames?: UserDisplayNameMap;
}) => {
    if (userId !== undefined && userId !== null) {
        const custom = normalizeUserDisplayName(
            userDisplayNames?.[`${userId}`],
        );
        if (custom) {
            return custom;
        }
    }

    const normalizedOriginal = normalizeUserDisplayName(originalName);
    if (normalizedOriginal) {
        return normalizedOriginal;
    }

    return userId === undefined || userId === null ? "" : `${userId}`;
};

export const resolveUserAvatarSource = ({
    userId,
    originalAvatarUrl,
    userAvatars,
}: {
    userId?: UserInfo["id"] | number;
    originalAvatarUrl?: string;
    userAvatars?: UserAvatarMap;
}) => {
    if (userId !== undefined && userId !== null) {
        const custom = normalizeUserAvatarSource(userAvatars?.[`${userId}`]);
        if (custom) {
            return custom;
        }
    }

    const original = normalizeUserAvatarSource(originalAvatarUrl);
    if (original) {
        return original;
    }

    return DEFAULT_USER_AVATAR;
};
