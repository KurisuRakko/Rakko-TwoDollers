import {
    type CSSProperties,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useBookStore } from "@/store/book";
import { cacheInDB } from "@/utils/cache";
import { GetOnlineAssetsCacheKey } from "@/utils/constant";
import { readFileAsDataUrl } from "@/utils/file";
import { loadStorageEndpoint } from "@/utils/storage-runtime";
import { DEFAULT_USER_AVATAR } from "@/utils/user-display";

const USER_AVATAR_CACHE_PREFIX = "user-avatar-cache";

const getPersistedCurrentBookId = () => {
    if (typeof window === "undefined") {
        return undefined;
    }

    try {
        const raw = window.localStorage.getItem("book-store");
        if (!raw) {
            return undefined;
        }

        const parsed = JSON.parse(raw) as {
            state?: { currentBookId?: string };
        };
        return parsed.state?.currentBookId;
    } catch {
        return undefined;
    }
};

const isPrivateAssetSource = (source: string) => {
    if (source.startsWith("data:") || source.startsWith("blob:")) {
        return false;
    }

    try {
        const url = new URL(source, window.location.origin);
        return (
            url.hostname === "raw.githubusercontent.com" ||
            (url.hostname === "api.github.com" &&
                url.pathname.includes("/contents/"))
        );
    } catch {
        return false;
    }
};

const getCachedAvatarKey = (source: string) => {
    return `${USER_AVATAR_CACHE_PREFIX}:${encodeURIComponent(source)}`;
};

const getCachedAvatarSource = (source: string) => {
    if (typeof window === "undefined") {
        return undefined;
    }

    try {
        const cached = window.localStorage.getItem(getCachedAvatarKey(source));
        return cached || undefined;
    } catch {
        return undefined;
    }
};

const persistCachedAvatarSource = async (source: string, blob: Blob) => {
    if (typeof window === "undefined") {
        return;
    }

    const dataUrl = await readFileAsDataUrl(blob).catch(() => undefined);
    if (!dataUrl) {
        return;
    }

    try {
        window.localStorage.setItem(getCachedAvatarKey(source), dataUrl);
    } catch {
        // Ignore quota errors and keep the runtime object URL only.
    }
};

export default function UserAvatarImage({
    source,
    alt,
    className,
    style,
}: {
    source?: string;
    alt?: string;
    className?: string;
    style?: CSSProperties;
}) {
    const currentBookId = useBookStore((state) => state.currentBookId);
    const fallbackSource = useMemo(
        () => source || DEFAULT_USER_AVATAR,
        [source],
    );
    const privateAssetSource = useMemo(
        () => isPrivateAssetSource(fallbackSource),
        [fallbackSource],
    );
    const cachedAvatarSource = useMemo(() => {
        if (!privateAssetSource) {
            return undefined;
        }

        return getCachedAvatarSource(fallbackSource);
    }, [fallbackSource, privateAssetSource]);
    const [url, setUrl] = useState(() => {
        if (!privateAssetSource) {
            return fallbackSource;
        }

        return cachedAvatarSource || DEFAULT_USER_AVATAR;
    });
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const releaseObjectUrl = () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
        const bookId = currentBookId || getPersistedCurrentBookId();

        releaseObjectUrl();

        if (!privateAssetSource) {
            setUrl(fallbackSource);
            return () => {};
        }

        // Private GitHub asset URLs need an authenticated fetch first.
        // Showing the raw URL directly is brittle on Safari and often ends in a blank avatar.
        setUrl(cachedAvatarSource || DEFAULT_USER_AVATAR);

        if (!bookId) {
            return () => {};
        }

        let cancelled = false;
        void loadStorageEndpoint()
            .then((storageAPI) => {
                if (!storageAPI.getOnlineAsset || cancelled) {
                    return;
                }

                return cacheInDB(
                    storageAPI.getOnlineAsset,
                    GetOnlineAssetsCacheKey,
                )?.(fallbackSource, bookId);
            })
            .then((blob) => {
                if (cancelled || blob === undefined) {
                    return;
                }

                releaseObjectUrl();
                const objectUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objectUrl;
                setUrl(objectUrl);
                void persistCachedAvatarSource(fallbackSource, blob);
            })
            .catch((error) => {
                console.error(error);
                if (!cancelled) {
                    setUrl(cachedAvatarSource || DEFAULT_USER_AVATAR);
                }
            });

        return () => {
            cancelled = true;
            releaseObjectUrl();
        };
    }, [cachedAvatarSource, currentBookId, fallbackSource, privateAssetSource]);

    return (
        <img
            src={url}
            alt={alt}
            className={className}
            style={style}
            onError={() => {
                const nextFallback =
                    privateAssetSource && cachedAvatarSource
                        ? cachedAvatarSource
                        : DEFAULT_USER_AVATAR;
                if (url !== nextFallback) {
                    setUrl(nextFallback);
                }
            }}
        />
    );
}
