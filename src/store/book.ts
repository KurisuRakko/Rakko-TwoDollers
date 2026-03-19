import { produce } from "immer";
import type { StateCreator } from "zustand";
import { create } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Book } from "@/api/endpoints/type";
import { loadStorageAPI } from "../api/storage/dynamic";

const BOOK_STORE_KEY = "book-store";

const readPersistedBookState = () => {
    if (typeof window === "undefined") {
        return {};
    }

    try {
        const raw = localStorage.getItem(BOOK_STORE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw) as {
            state?: Partial<Pick<BookStoreState, "books" | "currentBookId">>;
        };
        return parsed.state ?? {};
    } catch (error) {
        console.warn("Failed to read persisted book state:", error);
        return {};
    }
};

type BookStoreState = {
    currentBookId: string | undefined;
    books: Book[];
    visible: boolean;
    loading: boolean;
};

type BookStoreActions = {
    addBook: (name: string) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    switchToBook: (id: string | undefined) => Promise<void>;
    updateBookList: () => Promise<Book[]>;
};

type BookStore = BookStoreState & BookStoreActions;

type Persist<S> = (
    config: StateCreator<S>,
    options: PersistOptions<S>,
) => StateCreator<S>;

export const useBookStore = create<BookStore>()(
    (persist as Persist<BookStore>)(
        (set) => {
            const persistedState = readPersistedBookState();
            const persistedBooks = Array.isArray(persistedState.books)
                ? persistedState.books
                : [];
            const hasPersistedBooks =
                persistedBooks.length > 0 ||
                typeof persistedState.currentBookId === "string";
            const visible = false;
            const loading = false;
            const refreshBookList = async (background = false) => {
                await Promise.resolve();
                if (!background) {
                    set(
                        produce((state) => {
                            state.loading = true;
                        }),
                    );
                }
                try {
                    const { StorageAPI } = await loadStorageAPI();
                    const res = await StorageAPI.fetchAllBooks();
                    const allBooks = res;
                    set(
                        produce((state: BookStore) => {
                            state.books = allBooks;
                        }),
                    );
                    return allBooks;
                } finally {
                    if (!background) {
                        set(
                            produce((state) => {
                                state.loading = false;
                            }),
                        );
                    }
                }
            };
            const updateBookList = async () => refreshBookList(false);
            void refreshBookList(hasPersistedBooks);
            return {
                loading,
                visible,
                books: persistedBooks,
                currentBookId: persistedState.currentBookId,
                updateBookList,
                addBook: async (name) => {
                    const { StorageAPI } = await loadStorageAPI();
                    await StorageAPI.createBook(name);
                    await updateBookList();
                },
                deleteBook: async (id) => {
                    await updateBookList();
                },
                switchToBook: async (id) => {
                    set(
                        produce((state) => {
                            state.currentBookId = id;
                            state.visible = false;
                            Promise.resolve().then(() => {
                                location.reload();
                            });
                        }),
                    );
                },
            };
        },
        {
            name: BOOK_STORE_KEY,
            storage: createJSONStorage(() => localStorage),
            version: 0,
            partialize(state) {
                return {
                    books: state.books,
                    currentBookId: state.currentBookId,
                } as any;
            },
        },
    ),
);
