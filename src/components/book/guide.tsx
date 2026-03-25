import { Dialog, VisuallyHidden } from "radix-ui";
import { Suspense } from "react";
import { useIntl } from "@/locale";
import { useBookStore } from "@/store/book";
import { useIsLogin } from "@/store/user";
import { cn } from "@/utils";
import { lazyWithReload } from "@/utils/lazy";

const BookForm = lazyWithReload(
    () => import("./form").then(({ BookForm }) => ({ default: BookForm })),
    undefined,
    { preload: false },
);

export default function BookGuide() {
    const t = useIntl();
    const isLogin = useIsLogin();
    const { currentBookId } = useBookStore();
    if (!isLogin) {
        return null;
    }
    if (currentBookId !== undefined) {
        return null;
    }

    return (
        <Dialog.Root open={currentBookId === undefined}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed z-[2] inset-0 bg-black/50 data-[state=open]:animate-overlay-show"></Dialog.Overlay>
                <Dialog.Content>
                    <VisuallyHidden.Root>
                        <Dialog.Title>{t("select-a-book")}</Dialog.Title>
                        <Dialog.Description>
                            {t("select-a-book")}
                        </Dialog.Description>
                    </VisuallyHidden.Root>
                    <div className="fixed z-[3] top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none">
                        <Dialog.Content
                            className={cn(
                                "bg-background max-h-[55vh] w-fit max-w-[500px] rounded-md data-[state=open]:animate-content-show",
                            )}
                        >
                            <VisuallyHidden.Root>
                                <Dialog.Title>
                                    {t("select-a-book")}
                                </Dialog.Title>
                                <Dialog.Description>
                                    {t("select-a-book")}
                                </Dialog.Description>
                            </VisuallyHidden.Root>
                            <Suspense
                                fallback={
                                    <div className="w-[350px] h-[480px] max-h-[55vh] flex items-center justify-center text-sm text-muted-foreground">
                                        {t("loading-books")}
                                    </div>
                                }
                            >
                                <BookForm />
                            </Suspense>
                        </Dialog.Content>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
