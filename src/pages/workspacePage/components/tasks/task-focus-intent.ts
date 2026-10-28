/** Rows that are about to be focused by a selection key: focusing them must not select the task for the details. */
const pending = new WeakSet<HTMLElement>()

/** Focuses a row without the focus selecting the task for the details panel (Shift+arrows, Ctrl+Space). */
export function focusKeepingDetails(row: HTMLElement | null) {
    if (!row) return
    pending.add(row)
    row.focus()
    // Already focused: no focus event comes, so the flag must not stay behind
    pending.delete(row)
}

/** True while the focus that just arrived on the row comes from {@link focusKeepingDetails}. */
export const isFocusKeepingDetails = (row: HTMLElement) => pending.has(row)
