import type { EditBill } from "@/store/ledger";
import { useLedgerStore } from "@/store/ledger";
import type { Scheduled } from "./type";

export type PersistableScheduled = Omit<Scheduled, "id"> & {
    id?: string;
    needBills?: EditBill[];
};

export async function persistScheduledDraft({
    draft,
    add,
    update,
    currentId,
}: {
    draft?: PersistableScheduled;
    add: (
        scheduled: Omit<Scheduled, "id"> & { id?: string },
    ) => Promise<string | undefined>;
    update: (
        id: string,
        value?: Omit<Scheduled, "id">,
    ) => Promise<void | undefined>;
    currentId?: string;
}) {
    if (!draft) {
        return false;
    }

    const { needBills = [], id, ...value } = draft;

    if (needBills.length > 0) {
        useLedgerStore.getState().addBills([...needBills]);
    }

    if (currentId) {
        await update(currentId, value);
    } else {
        await add({ ...value, id });
    }

    return true;
}
