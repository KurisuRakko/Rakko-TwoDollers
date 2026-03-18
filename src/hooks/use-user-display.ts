import { useMemo } from "react";
import type { UserInfo } from "@/api/endpoints/type";
import { useLedgerStore } from "@/store/ledger";
import { useUserStore } from "@/store/user";
import {
    normalizeUserAvatarSource,
    resolveUserAvatarSource,
    resolveUserDisplayName,
} from "@/utils/user-display";

export type ResolvedUserInfo = UserInfo & {
    avatarSource: string;
    hasCustomAvatar: boolean;
    originalAvatarUrl: string;
    originalName: string;
    displayName: string;
};

export function useUserDisplayName(
    userId?: UserInfo["id"] | number,
    originalName?: string,
) {
    const userDisplayNames = useLedgerStore(
        (state) => state.infos?.meta.userDisplayNames,
    );

    return useMemo(() => {
        return resolveUserDisplayName({
            userId,
            originalName,
            userDisplayNames,
        });
    }, [originalName, userDisplayNames, userId]);
}

export function useUserAvatarSource(
    userId?: UserInfo["id"] | number,
    originalAvatarUrl?: string,
) {
    const userAvatars = useLedgerStore(
        (state) => state.infos?.meta.userAvatars,
    );

    return useMemo(() => {
        return resolveUserAvatarSource({
            userId,
            originalAvatarUrl,
            userAvatars,
        });
    }, [originalAvatarUrl, userAvatars, userId]);
}

export function useCurrentUserDisplay() {
    const expired = useUserStore((state) => state.expired);
    const id = useUserStore((state) => state.id);
    const originalAvatarUrl = useUserStore((state) => state.avatar_url);
    const originalName = useUserStore((state) => state.name);
    const displayName = useUserDisplayName(id, originalName);
    const avatarSource = useUserAvatarSource(id, originalAvatarUrl);
    const userAvatars = useLedgerStore(
        (state) => state.infos?.meta.userAvatars,
    );

    return useMemo(
        () => ({
            expired,
            id,
            originalAvatarUrl,
            originalName,
            avatarSource,
            displayName,
            hasCustomAvatar: Boolean(
                normalizeUserAvatarSource(userAvatars?.[`${id}`]),
            ),
        }),
        [
            avatarSource,
            displayName,
            expired,
            id,
            originalAvatarUrl,
            originalName,
            userAvatars,
        ],
    );
}

export function useCreators() {
    const creators = useLedgerStore((state) => state.infos?.creators);
    const userAvatars = useLedgerStore(
        (state) => state.infos?.meta.userAvatars,
    );
    const userDisplayNames = useLedgerStore(
        (state) => state.infos?.meta.userDisplayNames,
    );

    return useMemo(() => {
        return (creators ?? []).map((creator) => ({
            ...creator,
            avatarSource: resolveUserAvatarSource({
                userId: creator.id,
                originalAvatarUrl: creator.avatar_url,
                userAvatars,
            }),
            hasCustomAvatar: Boolean(
                normalizeUserAvatarSource(userAvatars?.[`${creator.id}`]),
            ),
            originalAvatarUrl: creator.avatar_url,
            originalName: creator.name,
            displayName: resolveUserDisplayName({
                userId: creator.id,
                originalName: creator.name,
                userDisplayNames,
            }),
        }));
    }, [creators, userAvatars, userDisplayNames]);
}
