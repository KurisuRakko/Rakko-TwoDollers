import { wrap } from "comlink";
import modal from "@/components/modal";
import { GithubEndpoint } from "../endpoints/github";
import { OfflineEndpoint } from "../endpoints/offline";
import { BillIndexedDBStorage } from "@/database/storage";
import type { Exposed } from "./worker";
import DeferredWorker from "./worker?worker";

const APIS = {
    github: GithubEndpoint,
    offline: OfflineEndpoint,
};

const SYNC_ENDPOINT_KEY = "SYNC_ENDPOINT";
type SupportedStorageType = keyof typeof APIS;

const savedType = localStorage.getItem(SYNC_ENDPOINT_KEY);
const type: SupportedStorageType =
    savedType === "github" ? "github" : "offline";

if (savedType && savedType !== type) {
    localStorage.setItem(SYNC_ENDPOINT_KEY, type);
}

const PENDING_MIGRATION_KEY = "PENDING_MIGRATION";

const _StorageAPI = APIS[type];
const actions = _StorageAPI.init({ modal });
const loginWithGithubToken = () => GithubEndpoint.manuallyLogin?.({ modal });

export const StorageAPI = {
    name: _StorageAPI.name,
    type: _StorageAPI.type,
    ...actions,
    loginWith: async (targetType: string) => {
        if (targetType === "github") {
            if (localStorage.getItem(SYNC_ENDPOINT_KEY) === "offline") {
                localStorage.setItem(PENDING_MIGRATION_KEY, "true");
            }
            await GithubEndpoint.login({ modal });
            return;
        }
        if (targetType === "offline") {
            OfflineEndpoint.login({ modal });
        }
    },
    loginManuallyWith: async (targetType: string) => {
        if (targetType === "github") {
            const isOffline = localStorage.getItem(SYNC_ENDPOINT_KEY) === "offline";
            await loginWithGithubToken();
            if (isOffline) {
                const { migrateFromOffline } = await import("./migration");
                await migrateFromOffline(StorageAPI);
                location.reload();
            }
        }
    },
    clearAll: async () => {
        const storage = new BillIndexedDBStorage("dummy");
        await storage.dangerousClearAll();
        localStorage.clear();
        sessionStorage.clear();
    },
};

// Check for pending migration on boot
if (localStorage.getItem(PENDING_MIGRATION_KEY) === "true" && type !== "offline") {
    (async () => {
        try {
            const { migrateFromOffline } = await import("./migration");
            await migrateFromOffline(StorageAPI);
            localStorage.removeItem(PENDING_MIGRATION_KEY);
            // Optionally reload to refresh the UI with new data
            location.reload();
        } catch (e) {
            console.error("Migration failed:", e);
        }
    })();
}

// ComlinkSharedWorker

const workerInstance = new DeferredWorker({
    /* normal Worker options*/
});
const StorageDeferredAPI = wrap<Exposed>(workerInstance);

export { StorageDeferredAPI };
