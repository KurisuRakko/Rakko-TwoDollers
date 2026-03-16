import { useLedgerStore } from "@/store/ledger";
import createConfirmProvider from "../confirm";
import EditorForm from "./form";

const confirms = createConfirmProvider(EditorForm, {
    dialogTitle: "Edit Bill",
    contentClassName:
        "editor-dialog-content h-full w-full max-h-full max-w-full rounded-none sm:rounded-[28px] sm:max-h-[88vh] sm:w-[92vw] sm:max-w-[640px]",
});

const [BillEditorProvider, showBillEditor] = confirms;

export { BillEditorProvider, showBillEditor };

export const goAddBill = async () => {
    const newBill = await showBillEditor();
    await useLedgerStore.getState().addBill(newBill);
};
