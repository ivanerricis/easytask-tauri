import type { Workspace } from "@/types/types"
import type { WorkspaceSort } from "@/lib/store/preferences"

// Dates are stored by SQLite as "YYYY-MM-DD" and "HH:MM:SS", so the concatenated strings sort chronologically
const editedKey = (w: Workspace) => `${w.edit_date} ${w.edit_time}`
const createdKey = (w: Workspace) => `${w.creation_date} ${w.creation_time}`

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Returns a sorted copy of the workspaces (the input is not mutated).
 * Ties are broken by last edit (newest first), then by id, so the order is stable.
 */
export const sortWorkspaces = (workspaces: Workspace[], sort: WorkspaceSort): Workspace[] => {
    const sign = sort.dir === "asc" ? 1 : -1
    const primary = (a: Workspace, b: Workspace): number => {
        switch (sort.by) {
            case "name": return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            case "created": return compareStrings(createdKey(a), createdKey(b))
            case "edited": return compareStrings(editedKey(a), editedKey(b))
        }
    }
    return [...workspaces].sort((a, b) => {
        const result = primary(a, b)
        if (result !== 0) return result * sign
        return compareStrings(editedKey(b), editedKey(a)) || a.id - b.id
    })
}
