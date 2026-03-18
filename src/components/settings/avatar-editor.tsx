import {
    type ChangeEvent,
    type PointerEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import createConfirmProvider from "@/components/confirm";
import PopupLayout from "@/layouts/popup-layout";
import { useIntl } from "@/locale";
import { readFileAsDataUrl } from "@/utils/file";
import { Button } from "../ui/button";
import UserAvatarImage from "../user-avatar";

const MAX_ZOOM = 3;
const OUTPUT_SIZE = 512;

type CropDraft = {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
    zoom: number;
    x: number;
    y: number;
};

type AvatarEditorValue = {
    currentAvatar?: string;
    displayName?: string;
    canReset?: boolean;
};

type AvatarEditorResult = { type: "save"; file: File } | { type: "reset" };

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

const getMinZoom = (
    viewportSize: number,
    naturalWidth: number,
    naturalHeight: number,
) => {
    if (viewportSize === 0 || naturalWidth === 0 || naturalHeight === 0) {
        return 1;
    }

    const coverScale = Math.max(
        viewportSize / naturalWidth,
        viewportSize / naturalHeight,
    );
    const containScale = Math.min(
        viewportSize / naturalWidth,
        viewportSize / naturalHeight,
    );

    return containScale / coverScale;
};

const getViewportMetrics = (
    viewportSize: number,
    naturalWidth: number,
    naturalHeight: number,
    zoom: number,
) => {
    const baseScale = Math.max(
        viewportSize / naturalWidth,
        viewportSize / naturalHeight,
    );
    const renderedWidth = naturalWidth * baseScale * zoom;
    const renderedHeight = naturalHeight * baseScale * zoom;
    const maxX = Math.max(0, (renderedWidth - viewportSize) / 2);
    const maxY = Math.max(0, (renderedHeight - viewportSize) / 2);
    return {
        renderedWidth,
        renderedHeight,
        maxX,
        maxY,
    };
};

const clampCropPosition = (crop: CropDraft, viewportSize: number) => {
    const { maxX, maxY } = getViewportMetrics(
        viewportSize,
        crop.naturalWidth,
        crop.naturalHeight,
        crop.zoom,
    );
    return {
        ...crop,
        x: clamp(crop.x, -maxX, maxX),
        y: clamp(crop.y, -maxY, maxY),
    };
};

async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function canvasToJpegFile(canvas: HTMLCanvasElement, name: string) {
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) {
        throw new Error("failed to export avatar");
    }

    return new File([blob], name, {
        type: "image/jpeg",
        lastModified: Date.now(),
    });
}

function AvatarEditorForm({
    edit,
    onCancel,
    onConfirm,
}: {
    edit?: AvatarEditorValue;
    onCancel?: () => void;
    onConfirm?: (value: AvatarEditorResult) => void;
}) {
    const t = useIntl();
    const inputRef = useRef<HTMLInputElement>(null);
    const dragStateRef = useRef<{
        pointerId: number;
        x: number;
        y: number;
    } | null>(null);
    const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
    const [viewportSize, setViewportSize] = useState(0);
    const minZoom = useMemo(() => {
        if (!cropDraft) {
            return 1;
        }

        return getMinZoom(
            viewportSize,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
        );
    }, [cropDraft, viewportSize]);

    const cropViewportObserveRef = useCallback(
        (element: HTMLDivElement | null) => {
            if (!element) {
                return;
            }

            const updateSize = () => {
                setViewportSize(
                    Math.min(element.clientWidth, element.clientHeight),
                );
            };

            updateSize();
            const observer = new ResizeObserver(updateSize);
            observer.observe(element);
            return () => observer.disconnect();
        },
        [],
    );

    useEffect(() => {
        setCropDraft((prev) => {
            if (!prev || viewportSize === 0) {
                return prev;
            }
            return clampCropPosition(
                {
                    ...prev,
                    zoom: clamp(prev.zoom, minZoom, MAX_ZOOM),
                },
                viewportSize,
            );
        });
    }, [minZoom, viewportSize]);

    const cropImageStyle = useMemo(() => {
        if (!cropDraft || viewportSize === 0) {
            return undefined;
        }

        const { renderedHeight, renderedWidth } = getViewportMetrics(
            viewportSize,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
            cropDraft.zoom,
        );

        return {
            width: `${renderedWidth}px`,
            height: `${renderedHeight}px`,
            transform: `translate(-50%, -50%) translate3d(${cropDraft.x}px, ${cropDraft.y}px, 0)`,
        };
    }, [cropDraft, viewportSize]);

    const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const dataUrl = await readFileAsDataUrl(file).catch(() => "");
        if (!dataUrl) {
            return;
        }

        const image = await loadImage(dataUrl).catch(() => null);
        if (!image) {
            return;
        }

        setCropDraft({
            src: dataUrl,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            zoom: Math.max(
                1,
                getMinZoom(
                    viewportSize,
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
        if (!cropDraft || viewportSize === 0) {
            return;
        }

        const image = await loadImage(cropDraft.src).catch(() => null);
        if (!image) {
            return;
        }

        const { renderedHeight, renderedWidth } = getViewportMetrics(
            viewportSize,
            cropDraft.naturalWidth,
            cropDraft.naturalHeight,
            cropDraft.zoom,
        );
        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const context = canvas.getContext("2d");
        if (!context) {
            return;
        }

        const imageLeft = (viewportSize - renderedWidth) / 2 + cropDraft.x;
        const imageTop = (viewportSize - renderedHeight) / 2 + cropDraft.y;
        const scale = OUTPUT_SIZE / viewportSize;

        context.fillStyle = "#111111";
        context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        context.drawImage(
            image,
            imageLeft * scale,
            imageTop * scale,
            renderedWidth * scale,
            renderedHeight * scale,
        );

        const file = await canvasToJpegFile(
            canvas,
            `avatar-${Date.now()}.jpg`,
        ).catch(() => null);
        if (!file) {
            return;
        }

        onConfirm?.({
            type: "save",
            file,
        });
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
            if (!prev || viewportSize === 0) {
                return prev;
            }

            return clampCropPosition(
                {
                    ...prev,
                    x: prev.x + deltaX,
                    y: prev.y + deltaY,
                },
                viewportSize,
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
            title={t("avatar-settings")}
            onBack={onCancel}
            className="h-full overflow-hidden"
        >
            <div className="relative flex flex-1 flex-col overflow-hidden px-4 pb-4">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                />

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                    <div className="rounded-[24px] border bg-background/72 p-4 shadow-sm backdrop-blur-sm">
                        <div className="text-sm font-medium">
                            {t("avatar-settings")}
                        </div>
                        <div className="pt-2 text-xs leading-5 opacity-65">
                            {t("avatar-tip")}
                        </div>
                    </div>

                    <div className="rounded-[28px] border bg-background/76 p-6 shadow-sm backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4">
                            <div className="size-28 overflow-hidden rounded-full border-2 border-white/70 shadow-lg">
                                <UserAvatarImage
                                    source={edit?.currentAvatar}
                                    alt={edit?.displayName}
                                    className="size-full object-cover"
                                />
                            </div>
                            <div className="text-sm font-medium">
                                {edit?.displayName}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                    >
                        <i className="icon-[mdi--image-plus-outline]" />
                        {t("avatar-upload-local")}
                    </Button>
                    {edit?.canReset ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                onConfirm?.({ type: "reset" });
                            }}
                        >
                            <i className="icon-[mdi--restore]" />
                            {t("avatar-reset-default")}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                        >
                            {t("cancel")}
                        </Button>
                    )}
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
                                {t("avatar-crop-title")}
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
                            {t("avatar-crop-tip")}
                        </div>

                        <div className="flex flex-1 items-center justify-center px-4 py-4">
                            <div
                                ref={cropViewportObserveRef}
                                className="relative aspect-square w-full max-w-[360px] overflow-hidden rounded-[30px] border bg-stone-950 shadow-2xl touch-none"
                                onPointerDown={onCropPointerDown}
                                onPointerMove={onCropPointerMove}
                                onPointerUp={onCropPointerUp}
                                onPointerCancel={onCropPointerUp}
                            >
                                <img
                                    src={cropDraft.src}
                                    alt={t("avatar-preview")}
                                    className="absolute left-1/2 top-1/2 max-w-none cursor-grab select-none object-cover will-change-transform active:cursor-grabbing"
                                    style={cropImageStyle}
                                    draggable={false}
                                />
                                <div className="pointer-events-none absolute inset-0 bg-black/36" />
                                <div className="pointer-events-none absolute inset-[10%] rounded-full border border-white/70 shadow-[0_0_0_9999px_rgba(10,10,10,0.34)]" />
                            </div>
                        </div>

                        <div className="px-4 pb-5">
                            <div className="rounded-[22px] border bg-background/80 p-4 shadow-sm">
                                <div className="flex items-center justify-between text-xs opacity-65">
                                    <span>{t("avatar-crop-zoom")}</span>
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
                                            if (!prev || viewportSize === 0) {
                                                return prev;
                                            }
                                            return clampCropPosition(
                                                {
                                                    ...prev,
                                                    zoom: nextZoom,
                                                },
                                                viewportSize,
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

const [AvatarEditorProvider, showAvatarEditor] = createConfirmProvider(
    AvatarEditorForm,
    {
        dialogTitle: "avatar-settings",
        dialogModalClose: true,
        contentClassName:
            "h-full w-full max-h-full max-w-full rounded-none sm:rounded-md sm:max-h-[80vh] sm:w-[90vw] sm:max-w-[520px]",
    },
);

export { AvatarEditorProvider, showAvatarEditor };
