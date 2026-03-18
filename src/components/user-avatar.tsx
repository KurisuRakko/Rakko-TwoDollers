import {
    type CSSProperties,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { StorageAPI } from "@/api/storage";
import { useBookStore } from "@/store/book";
import { cacheInDB } from "@/utils/cache";
import { GetOnlineAssetsCacheKey } from "@/utils/constant";
import { DEFAULT_USER_AVATAR } from "@/utils/user-display";

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
    const fallbackSource = useMemo(
        () => source || DEFAULT_USER_AVATAR,
        [source],
    );
    const [url, setUrl] = useState(fallbackSource);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const bookId = useBookStore.getState().currentBookId;
        setUrl(fallbackSource);

        if (
            !bookId ||
            !StorageAPI.getOnlineAsset ||
            !isPrivateAssetSource(fallbackSource)
        ) {
            return () => {};
        }

        let cancelled = false;
        cacheInDB(StorageAPI.getOnlineAsset, GetOnlineAssetsCacheKey)?.(
            fallbackSource,
            bookId,
        )
            .then((blob) => {
                if (cancelled || blob === undefined) {
                    return;
                }

                const objectUrl = URL.createObjectURL(blob);
                objectUrlRef.current = objectUrl;
                setUrl(objectUrl);
            })
            .catch((error) => {
                console.error(error);
                setUrl(fallbackSource);
            });

        return () => {
            cancelled = true;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [fallbackSource]);

    return <img src={url} alt={alt} className={className} style={style} />;
}
