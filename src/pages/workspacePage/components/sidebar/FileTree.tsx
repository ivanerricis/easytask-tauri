import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors,
    type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { File, Folder as FolderIcon } from "lucide-react"
import { buildDndAccessibility } from "@/lib/dnd-accessibility"
import { reportError } from "@/lib/report-error"
import type { Folder, Note } from "@/types/types"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { getErrorMessage, hexToRgba } from "@/lib/utils"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureTreePlace } from "@/contexts/undo/commands"
import { ItemNote } from "../note/Note"
import { ItemFolder } from "../folder/Folder"
import {
    computeDropTarget, computeDropZone, findTreeItem,
    type DropTarget, type DropZone, type TreeRef,
} from "./tree-dnd"
import { useItemSize } from "./item-size"
import { markTreeDragEnd, treeRowKey } from "./tree-row"
import { VIRTUALIZE_THRESHOLD, flattenTree } from "./flat-tree"
import { rowKeys, selectionKey } from "./selection"
import { useSelectionStore } from "./selection-context"
import { useSelectionActions } from "./selection-actions"
import type { PlannedMove } from "./tree-multi-move"
import { VirtualTree } from "./VirtualTree"

const ROOT_ID = "root"
const AUTO_EXPAND_DELAY = 600

type FileTreeItemProps = {
    item: Folder | Note
    collapsedIds: Set<number>
    onToggleFolder: (folderId: number) => void
    overKey: string | null
    overZone: DropZone | null
}

/** Recursive tree node. Defined at module level so the tree is not remounted on every render. */
export const FileTreeItem = ({ item, collapsedIds, onToggleFolder, overKey, overZone }: FileTreeItemProps) => {
    if (!item) return null

    if ("subfolders" in item) {
        return (
            <ItemFolder
                folder={item}
                isOpen={!collapsedIds.has(item.id)}
                onToggle={onToggleFolder}
                dropZone={overKey === treeRowKey("folder", item.id) ? overZone : null}
            >
                {item.subfolders?.map((child) => (
                    <FileTreeItem
                        key={`folder-${child.id}`}
                        item={child}
                        collapsedIds={collapsedIds}
                        onToggleFolder={onToggleFolder}
                        overKey={overKey}
                        overZone={overZone}
                    />
                ))}
                {item.notes?.map((note) => (
                    <ItemNote
                        key={`note-${note.id}`}
                        note={note}
                        dropZone={overKey === treeRowKey("note", note.id) ? overZone : null}
                    />
                ))}
            </ItemFolder>
        )
    }

    return <ItemNote note={item} dropZone={overKey === treeRowKey("note", item.id) ? overZone : null} />
}

/** What follows the pointer: the dragged item, or "N items" when the whole selection is dragged. */
const DragPreview = ({ item, isFolder, count }: { item: Folder | Note, isFolder: boolean, count: number }) => {
    const { t } = useTranslation()
    const size = useItemSize()
    const colorAlpha = useColorAlpha()
    const Icon = isFolder ? FolderIcon : File
    // The color of the item, over the background, like its row (a dragged selection has no single color)
    const tint = count > 1 || !item.color ? undefined : hexToRgba(colorAlpha.item(false), item.color)
    return (
        <div
            className={`flex items-center gap-1 ${size.row} px-1 rounded-xs border border-accent bg-background shadow-md opacity-90 w-48`}
            style={tint ? { backgroundImage: `linear-gradient(${tint}, ${tint})` } : undefined}
        >
            <Icon className={`${size.icon} shrink-0`} />
            <span className={`${size.text} truncate`}>{count > 1 ? t("menu.selection.dragCount", { count }) : item.name}</span>
        </div>
    )
}

const RootDropArea = ({ highlighted, children, rootRef }: { highlighted: boolean, children: React.ReactNode, rootRef?: React.RefObject<HTMLDivElement | null> }) => {
    const { setNodeRef } = useDroppable({ id: ROOT_ID })
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node)
        if (rootRef) rootRef.current = node
    }, [setNodeRef, rootRef])
    return (
        <div
            ref={setRefs}
            className={`relative flex flex-col gap-1 p-1 w-full min-h-full ${highlighted ? "bg-primary/10" : ""}`}
        >
            {children}
        </div>
    )
}

// Rows win over the root area; the closest-center fallback is only for the keyboard (no pointer).
const collisionDetection: CollisionDetection = (args) => {
    let hits = pointerWithin(args)
    if (!hits.length && !args.pointerCoordinates) hits = closestCenter(args)
    const rows = hits.filter(hit => hit.id !== ROOT_ID)
    return rows.length ? rows : hits
}

const getPointerY = (event: DragMoveEvent): number | null => {
    const origin = event.activatorEvent as { clientY?: number } | null
    if (origin && typeof origin.clientY === "number") return origin.clientY + event.delta.y
    const translated = event.active.rect.current.translated
    return translated ? translated.top + translated.height / 2 : null
}

type FileTreeProps = {
    collapsedIds: Set<number>
    onToggleFolder: (folderId: number) => void
    onExpandFolder: (folderId: number) => void
}

type HoverState = { overKey: string | null, zone: DropZone | null, rootActive: boolean }
const NO_HOVER: HoverState = { overKey: null, zone: null, rootActive: false }

/**
 * Sidebar tree with drag & drop. Drop zones (from the pointer position on the hovered row):
 * - note row: top half = before, bottom half = after;
 * - folder row: top 25% = before, bottom 25% = after, middle = inside (appended at the end).
 *   If the folder is expanded and has children the bottom 25% means "inside, first position";
 * - empty root area = end of the root.
 * Folders are always listed above notes, so a note dropped next to a folder becomes the first note
 * of that parent and a folder dropped next to a note becomes its last folder.
 */
export const FileTree = ({ collapsedIds, onToggleFolder, onExpandFolder }: FileTreeProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, getWorkspaceData, moveTreeItem } = useWorkspaceData()
    const recorder = useUndoRecorder()
    const [hover, setHover] = useState<HoverState>(NO_HOVER)
    const [activeRef, setActiveRef] = useState<TreeRef | null>(null)
    const targetRef = useRef<DropTarget | null>(null)
    // Dragging a selected row drags the whole selection: the plan of the move being hovered (null = no valid target)
    const store = useSelectionStore()
    const selectionActions = useSelectionActions()
    const [multiCount, setMultiCount] = useState(0)
    const multiPlanRef = useRef<PlannedMove[] | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    )

    const tree = useMemo(
        () => ({ rootFolders: workspaceDataTree?.rootFolders ?? [], rootNotes: workspaceDataTree?.rootNotes ?? [] }),
        [workspaceDataTree],
    )

    const accessibility = buildDndAccessibility(entry => {
        if (entry.id === ROOT_ID) return currentWorkspace?.name
        const ref = entry.data.current as TreeRef | undefined
        return ref ? findTreeItem(tree, ref)?.name : undefined
    }, { keyboard: true })

    const reset = useCallback(() => {
        targetRef.current = null
        multiPlanRef.current = null
        setMultiCount(0)
        setActiveRef(null)
        setHover(NO_HOVER)
    }, [])

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current as TreeRef | undefined
        setActiveRef(data ?? null)
        const dragsSelection = !!data && !!store && !!selectionActions && store.has(selectionKey(data.type, data.id)) && store.getSelected().size >= 2
        setMultiCount(dragsSelection ? selectionActions.getTargets().length : 0)
    }

    const handleDragMove = (event: DragMoveEvent) => {
        const active = event.active.data.current as TreeRef | undefined
        const over = event.over
        if (!active || !over) {
            targetRef.current = null
            multiPlanRef.current = null
            setHover(prev => prev === NO_HOVER ? prev : NO_HOVER)
            return
        }

        let overRef: TreeRef | null = null
        let zone: DropZone = "inside"
        if (over.id !== ROOT_ID) {
            overRef = over.data.current as TreeRef
            const pointerY = getPointerY(event)
            if (pointerY == null) return
            const overItem = findTreeItem(tree, overRef)
            const expandedWithChildren = overRef.type === "folder" && !collapsedIds.has(overRef.id) &&
                !!overItem && "subfolders" in overItem && (overItem.subfolders.length + overItem.notes.length) > 0
            zone = computeDropZone(overRef.type, over.rect, pointerY, { expandedWithChildren })
        }

        // Invalid or no-op targets (e.g. a folder into its own descendant) show no indicator
        const plan = multiCount > 0 && selectionActions ? selectionActions.planDrop(overRef, zone) : null
        multiPlanRef.current = plan
        const target = multiCount > 0 ? null : computeDropTarget(tree, active, overRef, zone)
        targetRef.current = target
        const valid = multiCount > 0 ? !!plan : !!target
        const next: HoverState = {
            overKey: overRef && valid ? treeRowKey(overRef.type, overRef.id) : null,
            zone: valid ? zone : null,
            rootActive: !overRef && valid,
        }
        setHover(prev => prev.overKey === next.overKey && prev.zone === next.zone && prev.rootActive === next.rootActive ? prev : next)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        markTreeDragEnd()
        const active = event.active.data.current as TreeRef | undefined
        const target = targetRef.current
        const plan = multiPlanRef.current
        reset()
        if (active && event.over && plan && selectionActions) {
            await selectionActions.executeMove(plan)
            const folderId = plan[0].to.folderId
            if (folderId != null) onExpandFolder(folderId)
            return
        }
        if (!active || !event.over || !target) return

        try {
            const from = captureTreePlace(workspaceDataTree, active.type, active.id)
            await moveTreeItem(active.type, active.id, target.folderId, target.index)
            if (from) recorder.treeMove(active.type, active.id, from.name, { folderId: from.folderId, index: from.index }, { folderId: target.folderId, index: target.index })
            if (target.folderId != null) onExpandFolder(target.folderId)
        } catch (err) {
            reportError(err, getErrorMessage(err))
        }
        if (currentWorkspace) {
            try {
                await getWorkspaceData(currentWorkspace.id)
            } catch (err) {
                reportError(err, i18n.t("errors.refreshTree"))
            }
        }
    }

    const handleDragCancel = () => {
        markTreeDragEnd()
        reset()
    }

    // Open a collapsed folder after hovering it for a while during a drag
    const hoveredFolderId = hover.overKey?.startsWith("folder-") ? Number(hover.overKey.slice("folder-".length)) : null
    useEffect(() => {
        if (hoveredFolderId == null || !collapsedIds.has(hoveredFolderId)) return
        const timer = setTimeout(() => onExpandFolder(hoveredFolderId), AUTO_EXPAND_DELAY)
        return () => clearTimeout(timer)
    }, [hoveredFolderId, collapsedIds, onExpandFolder])

    const activeItem = activeRef ? findTreeItem(tree, activeRef) : undefined
    const rootElRef = useRef<HTMLDivElement | null>(null)
    const flatRows = useMemo(() => flattenTree(tree, collapsedIds), [tree, collapsedIds])
    // The selection follows the rows in view: what disappears from the tree (or gets hidden) is deselected
    useEffect(() => { store?.sync(rowKeys(flatRows)) }, [store, flatRows])
    const virtualized = flatRows.length > VIRTUALIZE_THRESHOLD
    const getScrollElement = useCallback(
        () => rootElRef.current?.closest<HTMLElement>("[data-tree-scroll]") ?? rootElRef.current?.parentElement ?? null,
        [],
    )
    const isEmpty = tree.rootFolders.length === 0 && tree.rootNotes.length === 0

    return (
        <DndContext
            sensors={sensors}
            accessibility={accessibility}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            autoScroll
        >
            <RootDropArea highlighted={hover.rootActive} rootRef={rootElRef}>
                {isEmpty ? (
                    <p className="text-muted-foreground text-sm w-full">
                        {t("sidebar.emptyTree")}
                    </p>
                ) : virtualized ? (
                    <VirtualTree
                        rows={flatRows}
                        collapsedIds={collapsedIds}
                        onToggleFolder={onToggleFolder}
                        overKey={hover.overKey}
                        overZone={hover.zone}
                        activeKey={activeRef ? treeRowKey(activeRef.type, activeRef.id) : null}
                        getScrollElement={getScrollElement}
                    />
                ) : (
                    <>
                        {tree.rootFolders.map((folder) => (
                            <FileTreeItem
                                key={`folder-${folder.id}`}
                                item={folder}
                                collapsedIds={collapsedIds}
                                onToggleFolder={onToggleFolder}
                                overKey={hover.overKey}
                                overZone={hover.zone}
                            />
                        ))}
                        {tree.rootNotes.map((note) => (
                            <FileTreeItem
                                key={`note-${note.id}`}
                                item={note}
                                collapsedIds={collapsedIds}
                                onToggleFolder={onToggleFolder}
                                overKey={hover.overKey}
                                overZone={hover.zone}
                            />
                        ))}
                    </>
                )}
            </RootDropArea>
            <DragOverlay dropAnimation={null}>
                {activeItem && activeRef ? <DragPreview item={activeItem} isFolder={activeRef.type === "folder"} count={multiCount} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
