import { collectMatches } from "@/pages/workspacePage/components/note-search"
import { createNoteSearchStore } from "@/pages/workspacePage/components/note-search-store"
import type { Group } from "@/types/types"

/** A note search store that is open on `query` and has already scanned the given groups (for the tests of the rows). */
export function searchingStore(groups: Group[], query: string) {
    const store = createNoteSearchStore()
    store.open()
    store.setQuery(query)
    store.setMatches(collectMatches({ groups }, query, { hideCompleted: false }), true)
    return store
}
