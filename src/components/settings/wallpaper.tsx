import {
    type ChangeEvent,
    type PointerEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import { DEFAULT_WALLPAPER_PATH } from "@/utils/runtime-assets";
import createConfirmProvider from "../confirm";
import modal from "../modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const MAX_WALLPAPER_SIZE = 2 * 1024 * 1024;
const MAX_ZOOM = 3;
const OUTPUT_LONG_EDGE = 1800;

type CropDraft = {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    zoom: number;
    x: number;
    y: number;
};

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

const getMinZoom = (
    viewportWidth: number,
    viewportHeight: number,
    naturalWidth: number,
    naturalHeight: number,
) => {
    if (
        viewportWidth === 0 ||
        viewportHeight === 0 ||
        naturalWidth === 0 ||
        naturalHeight === 0
    ) {
        return 1;
    }

    const coverScale = Math.max(
        viewportWidth / naturalWidth,
        viewportHeight / naturalHeight,
    );
    const containScale = Math.min(
        viewportWidth / naturalWidth,
        viewportHeight / naturalHeight,
    );

    return containScale / coverScale;
};

const getViewportAspectRatio = () => {
    if (typeof window === "undefined") {
        return 16 / 10;
    }
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    if (!width || !height) {
        return 16 / 10;
    }
    return width / height;
};

const getOutputSize = (aspectRatio: number) => {
    if (aspectRatio >= 1) {
        return {
            width: OUTPUT_LONG_EDGE,
            height: Math.round(OUTPUT_LONG_EDGE / aspectRatio),
        };
    }
    return {
        width: Math.round(OUTPUT_LONG_EDGE * aspectRatio),
        height: OUTPUT_LONG_EDGE,
    };
};

function getViewportMetrics(
    viewportWidth: number,
    viewportHeight: number,
    naturalWidth: number,
    naturalHeight: number,
    zoom: number,
) {
    const baseScale = Math.max(
        viewportWidth / naturalWidth,
        viewportHeight / naturalHeight,
    );
    const renderedWidth = naturalWidth * baseScale * zoom;
    const renderedHeight = naturalHeight * baseScale * zoom;
    const maxX = Math.max(0, (renderedWidth - viewportWidth) / 2);
    const maxY = Math.max(0, (renderedHeight - viewportHeight) / 2);
    return {
        renderedWidth,
        renderedHeight,
        maxX,
        maxY,
    };
}

function clampCropPosition(
    crop: CropDraft,
    viewportWidth: number,
    viewportHeight: number,
) {
    const { maxX, maxY } = getViewportMetrics(
        viewportWidth,
        viewportHeight,
        crop.naturalWidth,
        crop.naturalHeight,
        crop.zoom,
    );
    return {
        ...crop,
        x: clamp(crop.x, -maxX, maxX),
        y: clamp(crop.y, -maxY, maxY),
    };
}

async function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function WallpaperForm({ onCancel }: { onCancel?: () => void }) {
    const t = useIntl();
    const savedWallpaper = usePreferenceStore((state) => state.mainWallpaper);
    const inputRef = useRef<HTMLInputElement>(null);
    const dragStateRef = useRef<{
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const [draft, setDraft] = useState(savedWallpaper ?? "");
    const [_preview, setPreview] = useState(
        savedWallpaper || DEFAULT_WALLPAPER_PATH,
    );
    const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
    const [viewportSize, setViewportSize] = useState({
        width: 0,
        height: 0,
    });
    const [cropStageSize, setCropStageSize] = useState({
        width: 0,
        height: 0,
    });
    const [cropAspectRatio, setCropAspectRatio] = useState(() =>
        getViewportAspectRatio(),
    );
    const minZoom = useMemo(() => {
        if (!cropDraft) {
            return 1;
        }

        return getMinZoom(
            viewportSize.width,
            viewportSize.height,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
        );
    }, [cropDraft, viewportSize.height, viewportSize.width]);

    useEffect(() => {
        setDraft(savedWallpaper ?? "");
        setPreview(savedWallpaper || DEFAULT_WALLPAPER_PATH);
    }, [savedWallpaper]);

    const cropViewportObserveRef = useCallback(
        (element: HTMLDivElement | null) => {
            if (!element) {
                return;
            }

            const updateSize = () => {
                setViewportSize({
                    width: element.clientWidth,
                    height: element.clientHeight,
                });
            };

            updateSize();
            const observer = new ResizeObserver(updateSize);
            observer.observe(element);
            return () => observer.disconnect();
        },
        [],
    );

    const cropStageObserveRef = useCallback(
        (element: HTMLDivElement | null) => {
            if (!element) {
                return;
            }

            const updateSize = () => {
                setCropStageSize({
                    width: element.clientWidth,
                    height: element.clientHeight,
                });
            };

            updateSize();
            const observer = new ResizeObserver(updateSize);
            observer.observe(element);
            return () => observer.disconnect();
        },
        [],
    );

    useEffect(() => {
        const updateAspectRatio = () => {
            setCropAspectRatio(getViewportAspectRatio());
        };

        updateAspectRatio();
        window.addEventListener("resize", updateAspectRatio);
        window.visualViewport?.addEventListener("resize", updateAspectRatio);

        return () => {
            window.removeEventListener("resize", updateAspectRatio);
            window.visualViewport?.removeEventListener(
                "resize",
                updateAspectRatio,
            );
        };
    }, []);

    useEffect(() => {
        setCropDraft((prev) => {
            if (
                !prev ||
                viewportSize.width === 0 ||
                viewportSize.height === 0
            ) {
                return prev;
            }
            return clampCropPosition(
                {
                    ...prev,
                    zoom: clamp(prev.zoom, minZoom, MAX_ZOOM),
                },
                viewportSize.width,
                viewportSize.height,
            );
        });
    }, [minZoom, viewportSize.height, viewportSize.width]);

    const cropImageStyle = useMemo(() => {
        if (
            !cropDraft ||
            viewportSize.width === 0 ||
            viewportSize.height === 0
        ) {
            return undefined;
        }

        const { renderedWidth, renderedHeight } = getViewportMetrics(
            viewportSize.width,
            viewportSize.height,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
            cropDraft.zoom,
        );

        return {
            width: `${renderedWidth}px`,
            height: `${renderedHeight}px`,
            transform: `translate3d(${cropDraft.x}px, ${cropDraft.y}px, 0)`,
        };
    }, [cropDraft, viewportSize.height, viewportSize.width]);

    const cropViewportStyle = useMemo(() => {
        if (cropStageSize.width === 0 || cropStageSize.height === 0) {
            return undefined;
        }

        const maxWidth = Math.min(cropStageSize.width, 520);
        const maxHeight = cropStageSize.height;

        let width = maxWidth;
        let height = width / cropAspectRatio;

        if (height > maxHeight) {
            height = maxHeight;
            width = height * cropAspectRatio;
        }

        return {
            width: `${width}px`,
            height: `${height}px`,
        };
    }, [cropAspectRatio, cropStageSize.height, cropStageSize.width]);

    const saveWallpaper = () => {
        const value = draft.trim();
        usePreferenceStore.setState({
            mainWallpaper: value ? value : undefined,
        });
        modal.toast.success(t("wallpaper-saved"));
        onCancel?.();
    };

    const resetWallpaper = () => {
        setDraft("");
        setPreview(DEFAULT_WALLPAPER_PATH);
        usePreferenceStore.setState({ mainWallpaper: undefined });
        modal.toast.success(t("wallpaper-reset-success"));
        onCancel?.();
    };

    const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (file.size > MAX_WALLPAPER_SIZE) {
            modal.toast.error(t("wallpaper-file-too-large"));
            event.target.value = "";
            return;
        }

        const dataUrl = await readFileAsDataUrl(file).catch(() => "");

        if (!dataUrl) {
            modal.toast.error(t("something-wrong-please-try-again"));
            event.target.value = "";
            return;
        }

        const image = await loadImage(dataUrl).catch(() => null);
        if (!image) {
            modal.toast.error(t("something-wrong-please-try-again"));
            event.target.value = "";
            return;
        }

        setCropDraft({
            src: dataUrl,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            zoom: Math.max(
                1,
                getMinZoom(
                    viewportSize.width,
                    viewportSize.height,
                    image.naturalWidth,
                    image.naturalHeight,
                ),
            ),
            x: 0,
            y: 0,
        });
        event.target.value = "";
    };

    const applyCrop = async () => {
        if (
            !cropDraft ||
            viewportSize.width === 0 ||
            viewportSize.height === 0
        ) {
            return;
        }

        const image = await loadImage(cropDraft.src).catch(() => null);
        if (!image) {
            modal.toast.error(t("something-wrong-please-try-again"));
            return;
        }

        const { renderedWidth, renderedHeight } = getViewportMetrics(
            viewportSize.width,
            viewportSize.height,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
            cropDraft.zoom,
        );
        const imageLeft =
            (viewportSize.width - renderedWidth) / 2 + cropDraft.x;
        const imageTop =
            (viewportSize.height - renderedHeight) / 2 + cropDraft.y;
        const outputSize = getOutputSize(cropAspectRatio);
        const canvas = document.createElement("canvas");
        canvas.width = outputSize.width;
        canvas.height = outputSize.height;
        const context = canvas.getContext("2d");

        if (!context) {
            modal.toast.error(t("something-wrong-please-try-again"));
            return;
        }

        const scaleX = outputSize.width / viewportSize.width;
        const scaleY = outputSize.height / viewportSize.height;

        context.fillStyle = "#111111";
        context.fillRect(0, 0, outputSize.width, outputSize.height);

        context.drawImage(
            image,
            imageLeft * scaleX,
            imageTop * scaleY,
            renderedWidth * scaleX,
            renderedHeight * scaleY,
        );
        const cropped = canvas.toDataURL("image/jpeg", 0.92);

        setDraft(cropped);
        setPreview(cropped);
        setCropDraft(null);
        modal.toast.success(t("wallpaper-crop-success"));
    };

    const onCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!cropDraft) {
            return;
        }
        dragStateRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        if (
            !cropDraft ||
            !dragState ||
            dragState.pointerId !== event.pointerId
        ) {
            return;
        }

        const deltaX = event.clientX - dragState.x;
        const deltaY = event.clientY - dragState.y;
        dragStateRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
        };

        setCropDraft((prev) => {
            if (
                !prev ||
                viewportSize.width === 0 ||
                viewportSize.height === 0
            ) {
                return prev;
            }

            return clampCropPosition(
                {
                    ...prev,
                    x: prev.x + deltaX,
                    y: prev.y + deltaY,
                },
                viewportSize.width,
                viewportSize.height,
            );
        });
    };

    const onCropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        if (dragStateRef.current?.pointerId !== event.pointerId) {
            return;
        }
        dragStateRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return (
        <PopupLayout
            title={t("wallpaper-settings")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="relative flex flex-1 flex-col overflow-y-auto px-4 pb-4">
                <div className="rounded-[24px] border bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                    <div className="text-sm font-medium">
                        {draft.trim()
                            ? t("wallpaper-url-label")
                            : t("wallpaper-preview-default")}
                    </div>
                    <div className="pt-2 text-xs leading-5 opacity-70">
                        {t("wallpaper-tip")}
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-[24px] border bg-background/72 p-4 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                        <div className="text-sm font-medium">
                            {t("wallpaper-url-label")}
                        </div>
                        <Input
                            value={draft}
                            onChange={(e) => {
                                const value = e.target.value;
                                setDraft(value);
                                setPreview(
                                    value.trim() || DEFAULT_WALLPAPER_PATH,
                                );
                            }}
                            placeholder={t("wallpaper-url-placeholder")}
                            className="bg-background/80"
                        />
                        <div className="text-xs leading-5 opacity-60">
                            {t("wallpaper-url-help")}
                        </div>
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onFileChange}
                    />

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => inputRef.current?.click()}
                        >
                            <i className="icon-[mdi--image-plus-outline]" />
                            {t("wallpaper-upload-local")}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setDraft("");
                                setPreview(DEFAULT_WALLPAPER_PATH);
                            }}
                        >
                            <i className="icon-[mdi--image-refresh-outline]" />
                            {t("wallpaper-preview-default")}
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-dashed px-3 py-2 text-xs leading-5 opacity-65">
                        {t("wallpaper-local-note")}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetWallpaper}
                    >
                        {t("wallpaper-reset-default")}
                    </Button>
                    <Button type="button" onClick={saveWallpaper}>
                        {t("save")}
                    </Button>
                </div>

                {cropDraft && (
                    <div className="absolute inset-0 z-30 flex flex-col bg-background/96 backdrop-blur-md">
                        <div className="flex items-center justify-between px-1 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCropDraft(null)}
                            >
                                {t("cancel")}
                            </Button>
                            <div className="text-sm font-medium">
                                {t("wallpaper-crop-title")}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={applyCrop}
                            >
                                {t("confirm")}
                            </Button>
                        </div>

                        <div className="px-4 pt-2 text-center text-xs leading-5 opacity-65">
                            {t("wallpaper-crop-tip")}
                        </div>

                        <div
                            ref={cropStageObserveRef}
                            className="flex min-h-0 flex-1 items-center justify-center px-4 py-4"
                        >
                            <div
                                ref={cropViewportObserveRef}
                                className="relative max-w-full max-h-full overflow-hidden rounded-[28px] border bg-stone-950 shadow-2xl touch-none"
                                style={cropViewportStyle}
                                onPointerDown={onCropPointerDown}
                                onPointerMove={onCropPointerMove}
                                onPointerUp={onCropPointerUp}
                                onPointerCancel={onCropPointerUp}
                            >
                                <img
                                    src={cropDraft.src}
                                    alt={t("wallpaper-preview")}
                                    className={cn(
                                        "absolute left-1/2 top-1/2 max-w-none cursor-grab select-none object-cover will-change-transform active:cursor-grabbing",
                                    )}
                                    style={
                                        cropImageStyle
                                            ? {
                                                  ...cropImageStyle,
                                                  transform: `translate(-50%, -50%) translate3d(${cropDraft.x}px, ${cropDraft.y}px, 0)`,
                                              }
                                            : undefined
                                    }
                                    draggable={false}
                                />
                                <div className="pointer-events-none absolute inset-0 border border-white/60 shadow-[inset_0_0_0_9999px_rgba(10,10,10,0.24)]" />
                                <div className="pointer-events-none absolute inset-x-[12%] top-0 bottom-0 border-x border-dashed border-white/28" />
                                <div className="pointer-events-none absolute inset-y-[14%] left-0 right-0 border-y border-dashed border-white/28" />
                            </div>
                        </div>

                        <div className="px-4 pb-5">
                            <div className="rounded-[22px] border bg-background/80 p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs opacity-65">
                                    <span>{t("wallpaper-crop-zoom")}</span>
                                    <span>
                                        {Math.round(
                                            (cropDraft.zoom / minZoom) * 100,
                                        )}
                                        %
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={minZoom}
                                    max={MAX_ZOOM}
                                    step="0.01"
                                    value={cropDraft.zoom}
                                    className="mt-3 w-full accent-foreground"
                                    onChange={(event) => {
                                        const nextZoom = Number(
                                            event.target.value,
                                        );
                                        setCropDraft((prev) => {
                                            if (
                                                !prev ||
                                                viewportSize.width === 0 ||
                                                viewportSize.height === 0
                                            ) {
                                                return prev;
                                            }
                                            return clampCropPosition(
                                                {
                                                    ...prev,
                                                    zoom: nextZoom,
                                                },
                                                viewportSize.width,
                                                viewportSize.height,
                                            );
                                        });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PopupLayout>
    );
}

const [WallpaperSettingsProvider, showWallpaperSettings] =
    createConfirmProvider(WallpaperForm, {
        dialogTitle: "wallpaper-settings",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[80vh] sm:w-[90vw] sm:max-w-[560px]",
    });

export default function WallpaperSettingsItem() {
    const t = useIntl();

    return (
        <div className="lab">
            <Button
                onClick={() => {
                    showWallpaperSettings();
                }}
                variant="ghost"
                className="w-full py-4 rounded-none h-auto"
            >
                <div className="w-full px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--image-outline] size-5"></i>
                        {t("wallpaper-settings")}
                    </div>
                    <i className="icon-[mdi--chevron-right] size-5"></i>
                </div>
            </Button>
            <WallpaperSettingsProvider />
        </div>
    );
}
