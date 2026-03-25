import { useIntl } from "@/locale";
import { openBookGuide } from "@/utils/deferred-openers";
import { Button } from "../ui/button";

export function BookSettings() {
    const t = useIntl();
    return (
        <div className="backup">
            <Button
                onClick={() => {
                    void openBookGuide();
                }}
                variant="ghost"
                className="w-full py-4 rounded-none h-auto"
            >
                <div className="w-full px-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <i className="icon-[mdi--book-cog-outline] size-5"></i>
                        {t("ledger-books")}
                    </div>
                    <i className="icon-[mdi--chevron-right] size-5"></i>
                </div>
            </Button>
        </div>
    );
}
