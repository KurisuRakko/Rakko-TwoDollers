import createConfirmProvider from "../confirm";
import BillInfo from "./form";

const [BillInfoProvider, showBillInfo] = createConfirmProvider(BillInfo, {
    dialogTitle: "bill info",
    dialogModalClose: true,
    contentClassName:
        "bill-info-dialog max-h-[72vh] w-[92vw] max-w-[560px] rounded-[24px]",
    fade: true,
    swipe: false,
});

export { BillInfoProvider, showBillInfo };
