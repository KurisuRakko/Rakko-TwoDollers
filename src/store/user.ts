import { produce } from "immer";
import type { StateCreator } from "zustand";
import { create } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import type { UserInfo } from "@/api/endpoints/type";
import { loadStorageAPI } from "@/api/storage/dynamic";
import { t } from "@/locale";

const toastLib = import("sonner");

const USER_STORE_KEY = "user-store";

const readPersistedUserState = () => {
    if (typeof window === "undefined") {
        return {};
    }

    try {
        const raw = localStorage.getItem(USER_STORE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as {
            state?: Partial<Pick<UserStoreState, "avatar_url" | "name" | "id">>;
        };
        return parsed.state ?? {};
    } catch (error) {
        console.warn("Failed to read persisted user state:", error);
        return {};
    }
};

type UserStoreState = {
    avatar_url: string;
    name: string;
    id: number | string;
    loading: boolean;
    expired?: boolean;
    cachedUsers: Record<string, UserInfo>;
    cachedCollaborators: Record<string, UserInfo[]>;
    forceLoginUI: boolean;
};

type UserStoreActions = {
    updateUserInfo: () => Promise<void>;

    getUserInfo: (login: string) => Promise<UserInfo>;
    getCollaborators: (repo: string) => Promise<UserInfo[]>;
    setForceLoginUI: (show: boolean) => void;
};

type UserStore = UserStoreState & UserStoreActions;

type Persist<S> = (
    config: StateCreator<S>,
    options: PersistOptions<S>,
) => StateCreator<S>;

export const useUserStore = create<UserStore>()(
    (persist as Persist<UserStore>)(
        (set, get) => {
            const persistedUser = readPersistedUserState();
            const hasPersistedUser =
                persistedUser.id !== -1 && Boolean(persistedUser.id);
            const refreshUserInfo = async (background = false) => {
                const { StorageAPI } = await loadStorageAPI();
                await Promise.resolve();
                if (!background) {
                    set(
                        produce((state) => {
                            state.loading = true;
                        }),
                    );
                }
                try {
                    const res = await StorageAPI.getUserInfo();
                    set(
                        produce((state: UserStore) => {
                            state.avatar_url = res.avatar_url;
                            state.name = res.name;
                            state.id = res.id;
                            state.expired = undefined;
                        }),
                    );
                } catch (error) {
                    if ((error as Error)?.message.includes("Bad credentials")) {
                        const { toast } = await toastLib;
                        toast.error(
                            t(
                                "token-expired-please-re-login-to-github-from-setting-page",
                            ),
                            {
                                position: "top-center",
                                action: {
                                    label: t("re-login"),
                                    onClick: () => {
                                        StorageAPI.loginWith(StorageAPI.type);
                                    },
                                },
                            },
                        );
                    }
                    set(
                        produce((state: UserStore) => {
                            state.expired = true;
                        }),
                    );
                    if (!background) {
                        throw error;
                    }
                } finally {
                    if (!background || get().loading) {
                        set(
                            produce((state) => {
                                state.loading = false;
                            }),
                        );
                    }
                }
            };

            const updateUserInfo = async () => refreshUserInfo(false);

            void refreshUserInfo(hasPersistedUser);

            const getUserInfo = async (login: string) => {
                const run = async () => {
                    const { StorageAPI } = await loadStorageAPI();
                    const res = await StorageAPI.getUserInfo(login);
                    const info = {
                        avatar_url: res.avatar_url,
                        name: res.name,
                        id: res.id,
                    };
                    set(
                        produce((state: UserStore) => {
                            state.cachedUsers[login] = info;
                        }),
                    );
                    return res;
                };
                const cachedUsers = get().cachedUsers;
                if (cachedUsers[login]) {
                    run();
                    return cachedUsers[login];
                }

                return run();
            };

            const getCollaborators = async (repo: string) => {
                const run = async () => {
                    const { StorageAPI } = await loadStorageAPI();
                    const res = await StorageAPI.getCollaborators(repo);
                    set(
                        produce((state: UserStore) => {
                            state.cachedCollaborators[repo] = res;
                        }),
                    );
                    return res;
                };
                const cachedCollaborators = get().cachedCollaborators;
                if (cachedCollaborators[repo]) {
                    run();
                    return cachedCollaborators[repo];
                }
                return run();
            };
            return {
                loading: !hasPersistedUser,
                avatar_url: persistedUser.avatar_url ?? "",
                login: "",
                name: persistedUser.name ?? "",
                id: persistedUser.id ?? 0,
                updateUserInfo,
                getUserInfo,
                getCollaborators,
                cachedUsers: {},
                cachedCollaborators: {},
                forceLoginUI: false,
                setForceLoginUI: (show: boolean) => {
                    set(
                        produce((state: UserStore) => {
                            state.forceLoginUI = show;
                        }),
                    );
                },
            };
        },
        {
            name: USER_STORE_KEY,
            storage: createJSONStorage(() => localStorage),
            version: 0,
            partialize(state) {
                return {
                    avatar_url: state.avatar_url,
                    name: state.name,
                    id: state.id,
                } as any;
            },
        },
    ),
);

export const useIsLogin = () => {
    const isLogin = useUserStore(
        useShallow((state) => state.id !== -1 && Boolean(state.id)),
    );
    return isLogin;
};
