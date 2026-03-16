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
    savedType === "offline" ? "offline" : "github";

if (savedType && savedType !== type) {
    localStorage.setItem(SYNC_ENDPOINT_KEY, type);
}

const _StorageAPI = APIS[type];
const actions = _StorageAPI.init({ modal });
const loginWithGithubToken = () => GithubEndpoint.manuallyLogin?.({ modal });

export const StorageAPI = {
    name: _StorageAPI.name,
    type: _StorageAPI.type,
    ...actions,
    loginWith: (type: string) => {
        if (type === "github") {
            return loginWithGithubToken();
        }
        if (type === "offline") {
            return OfflineEndpoint.login({ modal });
        }
    },
    loginManuallyWith: (type: string) => {
        if (type === "github") {
            return loginWithGithubToken();
        }
    },
    clearAll: async () => {
        const storage = new BillIndexedDBStorage("dummy");
        await storage.dangerousClearAll();
        localStorage.clear();
        sessionStorage.clear();
    },
};

// ComlinkSharedWorker

const workerInstance = new DeferredWorker({
    /* normal Worker options*/
});
const StorageDeferredAPI = wrap<Exposed>(workerInstance);

export { StorageDeferredAPI };
