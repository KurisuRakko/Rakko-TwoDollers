import { BillIndexedDBStorage } from "@/database/storage";
import { t } from "@/locale";
import { readFileAsDataUrl } from "@/utils/file";
import { DEFAULT_OFFLINE_USER_NAME } from "@/utils/user-display";
import type { SyncEndpointFactory, UserInfo } from "../type";
import { OfflineStorage } from "./core";

const OFFLINE_USER_KEY = "OFFLINE_USER";
const OFFLINE_USER_AVATAR = "/icon.png";

type OfflineUserRecord = {
    id: string;
};

const createOfflineUserRecord = (): OfflineUserRecord => {
    const rawId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return {
        id: `local-${rawId}`,
    };
};

const getOfflineUser = (): UserInfo => {
    const cached = localStorage.getItem(OFFLINE_USER_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached) as Partial<OfflineUserRecord>;
            if (typeof parsed.id === "string" && parsed.id.length > 0) {
                return {
                    id: parsed.id,
                    name: DEFAULT_OFFLINE_USER_NAME,
                    avatar_url: OFFLINE_USER_AVATAR,
                };
            }
        } catch (error) {
            console.warn("Failed to parse offline user record:", error);
        }
    }

    const record = createOfflineUserRecord();
    localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(record));
    return {
        id: record.id,
        name: DEFAULT_OFFLINE_USER_NAME,
        avatar_url: OFFLINE_USER_AVATAR,
    };
};

export const OfflineEndpoint: SyncEndpointFactory = {
    type: "offline",
    name: "offline",
    login: () => {
        localStorage.setItem("SYNC_ENDPOINT", "offline");
        location.reload();
    },
    manuallyLogin: undefined,
    init: ({ modal }) => {
        const repo = new OfflineStorage({
            storage: (name) => new BillIndexedDBStorage(`book-${name}`),
        });
        return {
            logout: async () => {
                // 暂时不清除本地数据
                return;
            },
            getUserInfo: async () => {
                return getOfflineUser();
            },
            getCollaborators: async () => [getOfflineUser()],
            uploadUserAvatar: async (_bookId, _userId, file) => {
                return readFileAsDataUrl(file);
            },
            getOnlineAsset: undefined,

            fetchAllBooks: repo.fetchAllStore.bind(repo),
            createBook: repo.createStore.bind(repo),
            initBook: repo.initStore.bind(repo),
            deleteBook: async (name) => {
                await modal.prompt({ title: t("delete-book-offline-tip") });
                return repo.deleteStore(name);
            },
            inviteForBook: undefined,

            batch: repo.batch.bind(repo),
            getMeta: repo.getMeta.bind(repo),
            getAllItems: repo.getAllItems.bind(repo),
            onChange: repo.onChange.bind(repo),

            getIsNeedSync: repo.getIsNeedSync.bind(repo),
            onSync: repo.onSync.bind(repo),
            toSync: repo.toSync.bind(repo),
        };
    },
};
