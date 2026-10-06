import { treeRowKey } from "./tree-row"
import {
    childFolders, childNotes, getFolderSubtreeIds, listTreeItems,
    type DropTarget, type DropZone, type MoveDestination, type TreeData, type TreeItemType, type TreeRef,
} from "./tree-dnd"

/** One step of a multi move: where the item is right before the step and where it ends up (final indexes among its siblings). */
export type PlannedMove = { type: TreeItemType, id: number, name: string, from: DropTarget, to: DropTarget }

/** Where the moved items of one type are inserted among the siblings of the destination. */
type Anchor = { mode: "start" } | { mode: "end" } | { mode: "before", id: number }

/**
 * Plans the move of several items (already reduced to the top-most ones, see getTopMostItems) onto a row (`over`) or
 * onto the empty root area (`over` null), with the same drop zones as the drag of a single item. The items keep their
 * order and land together: "inside" appends them to the folder, "before"/"after" put them next to the hovered row
 * (notes dropped next to a folder go first among the notes, folders dropped next to a note go last among the folders).
 * The steps are simulated in order, so every index is the one the database expects when the steps run one after the other
 * (and `from` is what the inverse step needs when they are undone in reverse).
 * Returns null when the drop is invalid (onto a moved item, a folder into itself or into its own descendant) or when
 * nothing would change; steps that leave an item exactly where it is are left out of the plan.
 */
export function planMultiMove(tree: TreeData, items: TreeRef[], over: TreeRef | null, zone: DropZone): PlannedMove[] | null {
    if (items.length === 0) return null
    const { folders, notes } = listTreeItems(tree)
    const find = (ref: TreeRef) => ref.type === "folder" ? folders.get(ref.id) : notes.get(ref.id)
    if (items.some(ref => !find(ref))) return null
    const moving = new Set(items.map(ref => treeRowKey(ref.type, ref.id)))

    let parentId: number | null = null
    let anchors: Record<TreeItemType, Anchor> = { folder: { mode: "end" }, note: { mode: "end" } }
    if (over) {
        const overItem = find(over)
        if (!overItem || moving.has(treeRowKey(over.type, over.id))) return null
        if (over.type === "folder" && (zone === "inside" || zone === "inside-start")) {
            parentId = over.id
            const mode = zone === "inside" ? "end" : "start"
            anchors = { folder: { mode }, note: { mode } }
        } else {
            parentId = overItem.folderID ?? null
            const siblings = over.type === "folder" ? childFolders(tree, parentId, folders) : childNotes(tree, parentId, folders)
            const index = siblings.findIndex(item => item.id === over.id)
            if (index < 0) return null
            let anchor: Anchor = { mode: "before", id: over.id }
            if (zone !== "before") {
                const next = siblings.slice(index + 1).find(item => !moving.has(treeRowKey(over.type, item.id)))
                anchor = next ? { mode: "before", id: next.id } : { mode: "end" }
            }
            anchors = over.type === "folder"
                ? { folder: anchor, note: { mode: "start" } }
                : { folder: { mode: "end" }, note: anchor }
        }
    }

    // A folder cannot go into itself or into its own subtree (which also covers a destination that is being moved)
    if (parentId !== null && items.some(ref => ref.type === "folder" && getFolderSubtreeIds(tree, ref.id).has(parentId!)))
        return null

    // Sibling lists as they are while the steps run
    const lists = new Map<string, number[]>()
    const initial = new Map<string, number[]>()
    const listOf = (type: TreeItemType, parent: number | null) => {
        const key = `${type}:${parent ?? "root"}`
        let list = lists.get(key)
        if (!list) {
            list = (type === "folder" ? childFolders(tree, parent, folders) : childNotes(tree, parent, folders)).map(item => item.id)
            lists.set(key, list)
            initial.set(key, [...list])
        }
        return list
    }

    const placed: Record<TreeItemType, number> = { folder: 0, note: 0 }
    const moves: PlannedMove[] = []
    for (const ref of items) {
        const item = find(ref)!
        const fromParent = item.folderID ?? null
        const source = listOf(ref.type, fromParent)
        const fromIndex = source.indexOf(ref.id)
        source.splice(fromIndex, 1)

        const destination = listOf(ref.type, parentId)
        const anchor = anchors[ref.type]
        let index = anchor.mode === "start" ? placed[ref.type]++ : destination.length
        if (anchor.mode === "before") index = destination.indexOf(anchor.id)
        if (index < 0) index = destination.length
        destination.splice(index, 0, ref.id)

        // A step that leaves the item in place does not change the lists: it is not part of the plan
        if (fromParent === parentId && fromIndex === index) continue
        moves.push({
            type: ref.type, id: ref.id, name: item.name,
            from: { folderId: fromParent, index: fromIndex },
            to: { folderId: parentId, index },
        })
    }
    // Appending items that are already together at the end of their folder shuffles them and puts them back: nothing changed
    const unchanged = [...lists].every(([key, list]) => list.length === initial.get(key)!.length && list.every((id, i) => id === initial.get(key)![i]))
    return moves.length > 0 && !unchanged ? moves : null
}

/**
 * Destinations of the "Sposta" submenu for several items: the workspace root and every folder (depth-first, with its depth)
 * where at least one of the items would actually move (not the folder that already holds all of them). Folders inside the moved ones are not offered.
 */
export function getMultiMoveDestinations(tree: TreeData, items: TreeRef[]): MoveDestination[] {
    const excluded = new Set<number>()
    for (const ref of items) if (ref.type === "folder") getFolderSubtreeIds(tree, ref.id).forEach(id => excluded.add(id))
    const { folders, notes } = listTreeItems(tree)
    const parents = items.map(ref => (ref.type === "folder" ? folders.get(ref.id) : notes.get(ref.id))?.folderID ?? null)
    // A folder that already holds every item is not a destination
    const offered = (id: number | null) => !parents.every(parent => parent === id) &&
        planMultiMove(tree, items, id === null ? null : { type: "folder", id }, "inside") !== null
    const result: MoveDestination[] = []
    if (offered(null)) result.push({ id: null, name: null, depth: 0 })
    const visit = (folders: TreeData["rootFolders"], depth: number) => {
        for (const folder of folders) {
            if (excluded.has(folder.id)) continue
            if (offered(folder.id))
                result.push({ id: folder.id, name: folder.name, depth })
            visit(folder.subfolders ?? [], depth + 1)
        }
    }
    visit(tree.rootFolders, 0)
    return result
}
