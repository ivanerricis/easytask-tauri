import type { Folder, Note } from "@/types/types"

export type TreeItemType = "folder" | "note"
export type DropZone = "before" | "after" | "inside" | "inside-start"
export type DropTarget = { folderId: number | null, index: number }
export type TreeData = { rootFolders: Folder[], rootNotes: Note[] }
export type TreeRef = { type: TreeItemType, id: number }

/** Index used to mean "append at the end"; the backend clamps it. */
export const END_INDEX = 1_000_000

type Rect = { top: number, height: number }

/**
 * Maps the pointer position on a row to a drop zone.
 * - note: top half = before, bottom half = after.
 * - folder: top 25% = before, bottom 25% = after, middle = inside (append at the end).
 *   When the folder is expanded and has children, its bottom 25% is "inside-start"
 *   (first position of the folder), because "after" would visually land below all its children.
 */
export function computeDropZone(
    overType: TreeItemType,
    rect: Rect,
    pointerY: number,
    opts: { expandedWithChildren?: boolean } = {},
): DropZone {
    const height = rect.height || 1
    const ratio = (pointerY - rect.top) / height
    if (overType === "note") return ratio < 0.5 ? "before" : "after"
    if (ratio < 0.25) return "before"
    if (ratio > 0.75) return opts.expandedWithChildren ? "inside-start" : "after"
    return "inside"
}

const lists = (tree: TreeData) => {
    const folders = new Map<number, Folder>()
    const notes = new Map<number, Note>()
    const walkFolders = (items: Folder[]) => {
        for (const folder of items) {
            folders.set(folder.id, folder)
            walkFolders(folder.subfolders ?? [])
            for (const note of folder.notes ?? []) notes.set(note.id, note)
        }
    }
    walkFolders(tree.rootFolders)
    for (const note of tree.rootNotes) notes.set(note.id, note)
    return { folders, notes }
}

const childFolders = (tree: TreeData, parentId: number | null, byId: Map<number, Folder>): Folder[] =>
    parentId == null ? tree.rootFolders : byId.get(parentId)?.subfolders ?? []

const childNotes = (tree: TreeData, parentId: number | null, byId: Map<number, Folder>): Note[] =>
    parentId == null ? tree.rootNotes : byId.get(parentId)?.notes ?? []

/** Ids of a folder and of all its descendant folders. */
export function getFolderSubtreeIds(tree: TreeData, folderId: number): Set<number> {
    const { folders } = lists(tree)
    const result = new Set<number>()
    const visit = (id: number) => {
        result.add(id)
        folders.get(id)?.subfolders?.forEach(child => visit(child.id))
    }
    visit(folderId)
    return result
}

/**
 * Computes the destination (parent folder + final index among siblings of the same type) for a drop.
 * `over` is the hovered row, or null for the empty root area (append to the root).
 * The returned index is the final index in the destination list after the item has been moved,
 * matching the semantics of `moveTreeItem`. Returns null when the drop is invalid or a no-op.
 */
export function computeDropTarget(
    tree: TreeData,
    active: TreeRef,
    over: TreeRef | null,
    zone: DropZone,
): DropTarget | null {
    const { folders, notes } = lists(tree)
    const activeItem = active.type === "folder" ? folders.get(active.id) : notes.get(active.id)
    if (!activeItem) return null
    if (over && over.type === active.type && over.id === active.id) return null

    let parentId: number | null
    let index: number

    // Same-type siblings of `parentId` excluding the active item
    const siblingsWithoutActive = (parent: number | null) =>
        (active.type === "folder" ? childFolders(tree, parent, folders) : childNotes(tree, parent, folders))
            .filter(item => item.id !== active.id)

    if (!over) {
        parentId = null
        index = siblingsWithoutActive(null).length
    } else {
        const overItem = over.type === "folder" ? folders.get(over.id) : notes.get(over.id)
        if (!overItem) return null

        if (over.type === "folder" && (zone === "inside" || zone === "inside-start")) {
            parentId = over.id
            index = zone === "inside" ? siblingsWithoutActive(parentId).length : 0
        } else {
            parentId = overItem.folderID ?? null
            if (over.type === active.type) {
                const withoutActive = siblingsWithoutActive(parentId)
                const overIndex = withoutActive.findIndex(item => item.id === over.id)
                if (overIndex < 0) return null
                index = zone === "before" ? overIndex : overIndex + 1
            } else if (active.type === "note") {
                // Notes live below folders: dropping next to a folder makes it the first note
                index = 0
            } else {
                // A folder dropped next to a note becomes the last folder
                index = siblingsWithoutActive(parentId).length
            }
        }
    }

    if (active.type === "folder" && parentId != null && getFolderSubtreeIds(tree, active.id).has(parentId))
        return null

    const currentParent = activeItem.folderID ?? null
    if (currentParent === parentId) {
        const currentIndex = (active.type === "folder"
            ? childFolders(tree, currentParent, folders)
            : childNotes(tree, currentParent, folders)).findIndex(item => item.id === active.id)
        if (currentIndex === index) return null
    }
    return { folderId: parentId, index }
}

export type MoveDestination = { id: number | null, name: string | null, depth: number }

/**
 * Destinations offered by the "Sposta in…" menu: the workspace root followed by every folder
 * (depth-first, with its depth), excluding the current parent and, for folders, itself and its descendants.
 */
export function getMoveDestinations(tree: TreeData, item: TreeRef & { folderID: number | null }): MoveDestination[] {
    const excluded = item.type === "folder" ? getFolderSubtreeIds(tree, item.id) : new Set<number>()
    const result: MoveDestination[] = []
    if (item.folderID != null) result.push({ id: null, name: null, depth: 0 })
    const visit = (items: Folder[], depth: number) => {
        for (const folder of items) {
            if (excluded.has(folder.id)) continue
            if (folder.id !== item.folderID) result.push({ id: folder.id, name: folder.name, depth })
            visit(folder.subfolders ?? [], depth + 1)
        }
    }
    visit(tree.rootFolders, 0)
    return result
}

/** Finds a folder or note in the tree. */
export function findTreeItem(tree: TreeData, ref: TreeRef): Folder | Note | undefined {
    const { folders, notes } = lists(tree)
    return ref.type === "folder" ? folders.get(ref.id) : notes.get(ref.id)
}
