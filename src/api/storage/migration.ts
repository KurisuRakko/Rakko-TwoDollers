import modal from "@/components/modal";
import { OfflineEndpoint } from "../endpoints/offline";
import type { StorageAPI } from "./index";

/**
 * Migrates data from the current offline storage to a new target storage.
 */
export async function migrateFromOffline(targetStorage: typeof StorageAPI) {
    console.log(
        "[Migration] Starting migration from offline to",
        targetStorage.type,
    );

    // 1. Initialize offline endpoint to fetch data
    const offlineActions = OfflineEndpoint.init({ modal });
    await new Promise((r) => setTimeout(r, 1000));
    const offlineBooks = await offlineActions.fetchAllBooks();

    if (offlineBooks.length === 0) {
        console.log("[Migration] No offline books found, skipping.");
        return;
    }

    for (const book of offlineBooks) {
        console.log(`[Migration] Migrating book: ${book.name} (${book.id})`);

        // 2. Fetch all items from offline book
        const bills = await offlineActions.getAllItems(book.id);
        const meta = await offlineActions.getMeta(book.id);

        // 3. Create book in target storage
        const newBook = await targetStorage.createBook(book.name);

        // 4. Batch all items to the new book
        if (bills.length > 0) {
            await targetStorage.batch(newBook.id, [
                ...bills.map((b) => ({ type: "update" as const, value: b })),
                { type: "meta" as const, metaValue: meta },
            ]);
        }
        await new Promise((r) => setTimeout(r, 1000));
    }

    console.log("[Migration] Migration completed successfully.");
}
