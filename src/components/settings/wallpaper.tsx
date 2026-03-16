import {
    type ChangeEvent,
    type PointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import defaultWallpaper from "../../../arknightswall9.jpg";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { usePreferenceStore } from "@/store/preference";
import { cn } from "@/utils";
import createConfirmProvider from "../confirm";
import modal from "../modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const MAX_WALLPAPER_SIZE = 2 * 1024 * 1024;
const CROPPER_RATIO = 16 / 10;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = Math.round(OUTPUT_WIDTH / CROPPER_RATIO);

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
    const cropViewportRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const [draft, setDraft] = useState(savedWallpaper ?? "");
    const [preview, setPreview] = useState(savedWallpaper || defaultWallpaper);
    const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
    const [viewportSize, setViewportSize] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        setDraft(savedWallpaper ?? "");
        setPreview(savedWallpaper || defaultWallpaper);
    }, [savedWallpaper]);

    useEffect(() => {
        const element = cropViewportRef.current;
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
    }, [cropDraft?.src]);

    useEffect(() => {
        if (!cropDraft || viewportSize.width === 0 || viewportSize.height === 0) {
            return;
        }
        setCropDraft((prev) => {
            if (!prev) {
                return prev;
            }
            return clampCropPosition(
                prev,
                viewportSize.width,
                viewportSize.height,
            );
        });
    }, [cropDraft?.zoom, viewportSize.height, viewportSize.width]);

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
        setPreview(defaultWallpaper);
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
            zoom: 1,
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
        const sx = ((0 - imageLeft) / renderedWidth) * cropDraft.naturalWidth;
        const sy = ((0 - imageTop) / renderedHeight) * cropDraft.naturalHeight;
        const sWidth =
            (viewportSize.width / renderedWidth) * cropDraft.naturalWidth;
        const sHeight =
            (viewportSize.height / renderedHeight) * cropDraft.naturalHeight;

        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_WIDTH;
        canvas.height = OUTPUT_HEIGHT;
        const context = canvas.getContext("2d");

        if (!context) {
            modal.toast.error(t("something-wrong-please-try-again"));
            return;
        }

        context.drawImage(
            image,
            sx,
            sy,
            sWidth,
            sHeight,
            0,
            0,
            OUTPUT_WIDTH,
            OUTPUT_HEIGHT,
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
        if (!cropDraft || !dragState || dragState.pointerId !== event.pointerId) {
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
                <div className="rounded-[24px] border bg-background/70 p-3 shadow-sm backdrop-blur-sm">
                    <div className="relative overflow-hidden rounded-[18px] border bg-muted/30">
                        <img
                            src={preview}
                            alt={t("wallpaper-preview")}
                            className="aspect-[16/10] w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    </div>
                    <div className="px-1 pt-3 text-xs leading-5 opacity-70">
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
                                setPreview(value.trim() || defaultWallpaper);
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
                                setPreview(defaultWallpaper);
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
                            <Button type="button" variant="ghost" onClick={applyCrop}>
                                {t("confirm")}
                            </Button>
                        </div>

                        <div className="px-4 pt-2 text-center text-xs leading-5 opacity-65">
                            {t("wallpaper-crop-tip")}
                        </div>

                        <div className="flex flex-1 items-center justify-center px-4 py-4">
                            <div
                                ref={cropViewportRef}
                                className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border bg-stone-950 shadow-2xl touch-none"
                                style={{ aspectRatio: `${CROPPER_RATIO}` }}
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
                                    <span>{Math.round(cropDraft.zoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={MIN_ZOOM}
                                    max={MAX_ZOOM}
                                    step="0.01"
                                    value={cropDraft.zoom}
                                    className="mt-3 w-full accent-foreground"
                                    onChange={(event) => {
                                        const nextZoom = Number(event.target.value);
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
