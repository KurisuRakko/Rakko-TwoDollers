import { loadStorageAPI } from "@/api/storage/dynamic";

export const SYNC_ENDPOINT_KEY = "SYNC_ENDPOINT";
export const DEFAULT_SYNC_ENDPOINT_TYPE = "offline";

export const getStoredSyncEndpointType = () => {
    if (typeof window === "undefined") {
        return DEFAULT_SYNC_ENDPOINT_TYPE;
    }

    return (
        window.localStorage.getItem(SYNC_ENDPOINT_KEY) ??
        DEFAULT_SYNC_ENDPOINT_TYPE
    );
};

export const loadStorageEndpoint = async () => {
    const { StorageAPI } = await loadStorageAPI();
    return StorageAPI;
};
