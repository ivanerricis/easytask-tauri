import { createExternalStore, useStoreSelector } from "@/lib/external-store"

type Announcement = { message: string, count: number }

const store = createExternalStore<Announcement>({ message: "", count: 0 })

/** Announces a message to the screen readers (polite) through the NoteAnnouncer. */
export const announce = (message: string) => store.set({ message, count: store.getState().count + 1 })

/** The text of the live region; the same message announced twice in a row alternates a non-breaking space so it is read again. */
export function useAnnouncement(): string {
    const { message, count } = useStoreSelector(store, state => state)
    return count % 2 === 0 ? message : `${message}\u00A0`
}
