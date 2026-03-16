import { useLedgerStore } from "@/store/ledger";
import createConfirmProvider from "../confirm";
import EditorForm from "./form";

const confirms = createConfirmProvider(EditorForm, {
    dialogTitle: "Edit Bill",
    contentClassName:
        "editor-dialog-content h-[100dvh] w-full max-h-[100dvh] max-w-full rounded-none sm:h-auto sm:rounded-[28px] sm:max-h-[88vh] sm:w-[92vw] sm:max-w-[640px]",
});

const [BillEditorProvider, showBillEditor] = confirms;

export { BillEditorProvider, showBillEditor };

export const goAddBill = async () => {
    const newBill = await showBillEditor();
    await useLedgerStore.getState().addBill(newBill);
};
