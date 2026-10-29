import { useTranslation } from "react-i18next"
import i18n from "@/i18n"
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react"
import {
    DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useDroppable, useSensor, useSensors,
    type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragStartEvent,
} from "@dnd-kit/core"
import { FilePlus, Folder as FolderIcon, FolderPlus } from "lucide-react"
import { buildDndAccessibility } from "@/lib/dnd-accessibility"
import { reportError } from "@/lib/report-error"
import type { Folder, Note } from "@/types/types"
import { useWorkspace } from "@/contexts/use-workspace"
import { useWorkspaceData } from "@/contexts/workspace-data"
import { getErrorMessage, hexToRgba } from "@/lib/utils"
import { useStoreSelector } from "@/lib/external-store"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { captureTreePlace } from "@/contexts/undo/commands"
import { ItemNote } from "../note/Note"
import { ItemFolder } from "../folder/Folder"
import {
    computeDropTarget, computeDropZone, findTreeItem,
    type DropTarget, type DropZone, type TreeRef,
} from "./tree-dnd"
import { useTreeData } from "./use-tree-data"
import { useItemSize } from "./item-size"
import { useGrabbingCursor } from "@/hooks/use-grabbing-cursor"
import { NO_TREE_HOVER, TreeHoverStoreContext, TreeTabStopContext, createTreeHoverStore, createTreeTabStopStore, markTreeDragEnd, treeRowKey, useTreeRootActive, type TreeHover } from "./tree-row"
import { treeKeyAction } from "./tree-keyboard"
import { VIRTUALIZE_THRESHOLD, flattenTree } from "./flat-tree"
import { parseSelectionKey, rowKeys, selectionKey } from "./selection"
import { useSelectionStore } from "./selection-context"
import { useSelectionActions } from "./selection-actions"
import type { PlannedMove } from "./tree-multi-move"
import { VirtualTree, type VirtualTreeHandle } from "./VirtualTree"
import { TreeBackgroundMenu } from "./TreeBackgroundMenu"
import { AddNoteDialog } from "../AddNoteDialog"
import { AddFolderDialog } from "../AddFolderDialog"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

const ROOT_ID = "root"
const AUTO_EXPAND_DELAY = 600

type FileTreeItemProps = {
    item: Folder | Note
    collapsedIds: Set<number>
    onToggleFolder: (folderId: number) => void
    /** Nesting depth, 0 for the root items. */
    depth?: number
}

/** Recursive tree node. Defined at module level so the tree is not remounted on every render. */
const FileTreeItem = memo(({ item, collapsedIds, onToggleFolder, depth = 0 }: FileTreeItemProps) => {
    if ("subfolders" in item) {
        return (
            <ItemFolder
                folder={item}
                isOpen={!collapsedIds.has(item.id)}
                onToggle={onToggleFolder}
                level={depth + 1}
            >
                {item.subfolders?.map((child) => (
                    <FileTreeItem
                        key={`folder-${child.id}`}
                        item={child}
                        collapsedIds={collapsedIds}
                        onToggleFolder={onToggleFolder}
                        depth={depth + 1}
                    />
                ))}
                {item.notes?.map((note) => (
                    <ItemNote
                        key={`note-${note.id}`}
                        note={note}
                        level={depth + 2}
                    />
                ))}
            </ItemFolder>
        )
    }

    return <ItemNote note={item} level={depth + 1} />
})

/** The virtualized tree, which alone follows the tab stop: a focus move re-renders it, not the whole FileTree. */
const TabStopVirtualTree = (props: Omit<React.ComponentProps<typeof VirtualTree>, "tabStopKey"> & { tabStopStore: ReturnType<typeof createTreeTabStopStore> }) => {
    const { tabStopStore, ...rest } = props
    const tabStopKey = useStoreSelector(tabStopStore, key => key)
    return <VirtualTree {...rest} tabStopKey={tabStopKey} />
}

/** What follows the pointer: the dragged item, or "N items" when the whole selection is dragged. */
const DragPreview = ({ item, count }: { item: Folder | Note, count: number }) => {
    const { t } = useTranslation()
    const size = useItemSize()
    const colorAlpha = useColorAlpha()
    // The color of the item, over the background, like its row (a dragged selection has no single color)
    const tint = count > 1 || !item.color ? undefined : hexToRgba(colorAlpha.item(false), item.color)
    return (
        <div
            className={`flex items-center gap-1 ${size.row} px-1 rounded-xs border border-accent bg-background shadow-md opacity-90 w-48`}
            style={tint ? { backgroundImage: `linear-gradient(${tint}, ${tint})` } : undefined}
        >
            <span className={`${size.text} truncate`}>{count > 1 ? t("menu.selection.dragCount", { count }) : item.name}</span>
        </div>
    )
}

/** Empty workspace: explains it and offers to create the first note or folder (in the root). */
const EmptyTree = () => {
    const { t } = useTranslation()
    const [noteOpen, setNoteOpen] = useState(false)
    const [folderOpen, setFolderOpen] = useState(false)
    return (
        <Empty className="p-4 md:p-4 gap-4">
            <EmptyHeader>
                <EmptyMedia variant="icon"><FolderIcon /></EmptyMedia>
                <EmptyTitle className="text-base">{t("sidebar.emptyTree")}</EmptyTitle>
                <EmptyDescription>{t("sidebar.emptyTreeHint")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button size="sm" onClick={() => setNoteOpen(true)}>
                    <FilePlus />
                    {t("sidebar.addNote")}
                </Button>
                <Button size="sm" onClick={() => setFolderOpen(true)}>
                    <FolderPlus />
                    {t("sidebar.addFolder")}
                </Button>
            </EmptyContent>
            <AddNoteDialog open={noteOpen} onOpenChange={setNoteOpen} parentId={null} withColor />
            <AddFolderDialog open={folderOpen} onOpenChange={setFolderOpen} parentId={null} withColor />
        </Empty>
    )
}

type RootDropAreaProps = React.ComponentProps<"div"> & { rootRef?: React.RefObject<HTMLDivElement | null>, treeLabel?: string }

const ROW_SELECTOR = "[data-row-key]"

// The rest of the props and the ref are the ones the right click menu (its trigger) gives to the area
const RootDropArea = ({ children, rootRef, treeLabel, ref: triggerRef, ...triggerProps }: RootDropAreaProps) => {
    const { setNodeRef } = useDroppable({ id: ROOT_ID })
    const highlighted = useTreeRootActive()
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node)
        if (rootRef) rootRef.current = node
        if (typeof triggerRef === "function") triggerRef(node)
        else if (triggerRef) triggerRef.current = node
    }, [setNodeRef, rootRef, triggerRef])
    return (
        <div
            {...triggerProps}
            ref={setRefs}
            role={treeLabel ? "tree" : undefined}
            aria-label={treeLabel}
            aria-multiselectable={treeLabel ? true : undefined}
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
    /** Collapses or expands every folder (an entry of the menu of the empty space of the tree). */
    onToggleAll?: () => void
    allCollapsed?: boolean
    /** An item to show: its row is selected, scrolled into view and focused once it is in the tree. */
    reveal?: { key: string, seq: number } | null
    /** Called when the reveal is done (or cannot be done), so the request can be dropped. */
    onRevealed?: () => void
}

/** Frames to wait for a row to mount (folders animate open, a virtualized row mounts after the scroll). */
const REVEAL_MAX_FRAMES = 20


/**
 * Sidebar tree with drag & drop. Drop zones (from the pointer position on the hovered row):
 * - note row: top half = before, bottom half = after;
 * - folder row: top 25% = before, bottom 25% = after, middle = inside (appended at the end).
 *   If the folder is expanded and has children the bottom 25% means "inside, first position";
 * - empty root area = end of the root.
 * Folders are always listed above notes, so a note dropped next to a folder becomes the first note
 * of that parent and a folder dropped next to a note becomes its last folder.
 */
export const FileTree = ({ collapsedIds, onToggleFolder, onExpandFolder, onToggleAll, allCollapsed = false, reveal = null, onRevealed }: FileTreeProps) => {
    const { t } = useTranslation()
    const { currentWorkspace } = useWorkspace()
    const { workspaceDataTree, getWorkspaceData, moveTreeItem } = useWorkspaceData()
    const tree = useTreeData()
    const recorder = useUndoRecorder()
    // What is hovered lives in a store: each row reads only its own drop zone (see TreeHover)
    const [hoverStore] = useState(createTreeHoverStore)
    // The row in the tab order (roving tabindex): the last one focused, or the first one
    const [tabStopStore] = useState(createTreeTabStopStore)
    const focusedKeyRef = useRef<string | null>(null)
    const [activeRef, setActiveRef] = useState<TreeRef | null>(null)
    useGrabbingCursor(activeRef !== null)
    const targetRef = useRef<DropTarget | null>(null)
    // Dragging a selected row drags the whole selection: the plan of the move being hovered (null = no valid target)
    const store = useSelectionStore()
    const selectionActions = useSelectionActions()
    const [multiCount, setMultiCount] = useState(0)
    const multiPlanRef = useRef<PlannedMove[] | null>(null)
    // The items a multi drag moves, computed once at drag start (not on every pointer move)
    const multiTargetsRef = useRef<TreeRef[]>([])
    // What the last pointer move resolved to: while it stays the same nothing needs recomputing
    const lastMoveRef = useRef<{ tree: object, active: string, over: string | null, zone: DropZone } | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    )

    const workspaceName = currentWorkspace?.name
    const accessibility = useMemo(() => buildDndAccessibility(entry => {
        if (entry.id === ROOT_ID) return workspaceName
        const ref = entry.data.current as TreeRef | undefined
        return ref ? findTreeItem(tree, ref)?.name : undefined
    }, { keyboard: true }), [tree, workspaceName])

    const reset = useCallback(() => {
        targetRef.current = null
        multiPlanRef.current = null
        multiTargetsRef.current = []
        lastMoveRef.current = null
        setMultiCount(0)
        setActiveRef(null)
        hoverStore.set(NO_TREE_HOVER)
    }, [hoverStore])

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current as TreeRef | undefined
        setActiveRef(data ?? null)
        const dragsSelection = !!data && !!store && !!selectionActions && store.has(selectionKey(data.type, data.id)) && store.getSelected().size >= 2
        const targets = dragsSelection ? selectionActions.getTargets() : []
        multiTargetsRef.current = targets.map(item => ({ type: item.itemType, id: item.id }))
        lastMoveRef.current = null
        setMultiCount(targets.length)
    }

    const handleDragMove = (event: DragMoveEvent) => {
        const active = event.active.data.current as TreeRef | undefined
        const over = event.over
        if (!active || !over) {
            targetRef.current = null
            multiPlanRef.current = null
            lastMoveRef.current = null
            hoverStore.set(NO_TREE_HOVER)
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

        // Same row, zone and tree as the last move: the target and the plan would come out the same
        const last = lastMoveRef.current
        const activeKey = treeRowKey(active.type, active.id)
        const overKey = overRef ? treeRowKey(overRef.type, overRef.id) : null
        if (last && last.tree === tree && last.active === activeKey && last.over === overKey && last.zone === zone) return
        lastMoveRef.current = { tree, active: activeKey, over: overKey, zone }

        // Invalid or no-op targets (e.g. a folder into its own descendant) show no indicator
        const plan = multiCount > 0 && selectionActions ? selectionActions.planDrop(overRef, zone, multiTargetsRef.current) : null
        multiPlanRef.current = plan
        const target = multiCount > 0 ? null : computeDropTarget(tree, active, overRef, zone)
        targetRef.current = target
        const valid = multiCount > 0 ? !!plan : !!target
        const next: TreeHover = {
            overKey: overRef && valid ? treeRowKey(overRef.type, overRef.id) : null,
            zone: valid ? zone : null,
            rootActive: !overRef && valid,
        }
        const prev = hoverStore.getState()
        if (prev.overKey !== next.overKey || prev.zone !== next.zone || prev.rootActive !== next.rootActive) hoverStore.set(next)
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
    // (listening to the store, not to its state: the tree does not re-render each time the pointer changes row)
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        let hovered: number | null = null
        const check = () => {
            const key = hoverStore.getState().overKey
            const folderId = key?.startsWith("folder-") ? Number(key.slice("folder-".length)) : null
            if (folderId === hovered) return
            hovered = folderId
            clearTimeout(timer)
            if (folderId != null && collapsedIds.has(folderId)) timer = setTimeout(() => onExpandFolder(folderId), AUTO_EXPAND_DELAY)
        }
        check()
        const unsubscribe = hoverStore.subscribe(check)
        return () => { unsubscribe(); clearTimeout(timer) }
    }, [hoverStore, collapsedIds, onExpandFolder])

    const activeItem = activeRef ? findTreeItem(tree, activeRef) : undefined
    const rootElRef = useRef<HTMLDivElement | null>(null)
    const flatRows = useMemo(() => flattenTree(tree, collapsedIds), [tree, collapsedIds])
    // The selection follows the rows in view: what disappears from the tree (or gets hidden) is deselected
    useEffect(() => { store?.sync(rowKeys(flatRows)) }, [store, flatRows])
    const virtualized = flatRows.length > VIRTUALIZE_THRESHOLD
    const virtualRef = useRef<VirtualTreeHandle>(null)
    // A row that disappears (or gets hidden) takes the tab stop with it: it goes back to the first row
    useLayoutEffect(() => {
        const focused = focusedKeyRef.current
        tabStopStore.set(focused && flatRows.some(row => row.key === focused) ? focused : flatRows[0]?.key ?? null)
    }, [tabStopStore, flatRows])
    // After the sync above: the key has to be in the rows in view (the folders above it expanded) before it can be selected
    useEffect(() => {
        if (!reveal) return
        const target = parseSelectionKey(reveal.key)
        if (!target || !findTreeItem(tree, target)) {
            onRevealed?.()
            return
        }
        if (!flatRows.some(row => row.key === reveal.key)) return
        store?.reset()
        store?.toggle(reveal.key)
        if (virtualized) virtualRef.current?.scrollToKey(reveal.key)
        let frame = 0
        let tries = 0
        // The row may mount a frame or more later; the focus waits one more frame (the overlay sidebar sets its own focus first)
        const step = () => {
            const row = rootElRef.current?.querySelector<HTMLElement>(`[data-row-key="${reveal.key}"]`)
            if (row) {
                row.scrollIntoView({ block: "nearest" })
                frame = requestAnimationFrame(() => {
                    row.focus({ preventScroll: true })
                    onRevealed?.()
                })
            } else if (++tries < REVEAL_MAX_FRAMES) {
                frame = requestAnimationFrame(step)
            } else {
                onRevealed?.()
            }
        }
        frame = requestAnimationFrame(step)
        return () => cancelAnimationFrame(frame)
    }, [reveal, flatRows, virtualized, tree, store, onRevealed])
    const getScrollElement = useCallback(
        () => rootElRef.current?.closest<HTMLElement>("[data-tree-scroll]") ?? rootElRef.current?.parentElement ?? null,
        [],
    )
    const isEmpty = tree.rootFolders.length === 0 && tree.rootNotes.length === 0

    const handleTreeFocus = (event: FocusEvent<HTMLElement>) => {
        const key = (event.target as HTMLElement).closest?.(ROW_SELECTOR)?.getAttribute("data-row-key")
        if (!key) return
        focusedKeyRef.current = key
        tabStopStore.set(key)
    }

    /** Moves the focus to a row; a virtualized row that is not mounted yet is scrolled to and focused when it appears. */
    const focusRow = (key: string) => {
        focusedKeyRef.current = key
        tabStopStore.set(key)
        if (virtualized) virtualRef.current?.scrollToKey(key)
        let tries = 0
        const step = () => {
            const row = rootElRef.current?.querySelector<HTMLElement>(`[data-row-key="${key}"]`)
            if (row) row.focus()
            else if (++tries < REVEAL_MAX_FRAMES) requestAnimationFrame(step)
        }
        step()
    }

    // Arrows, Home and End move between the rows, Left / Right close / open the folders (Space and Enter are the row's own)
    const handleTreeKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        // A keyboard drag has its own keys; the field of a rename and the buttons of a row are not rows
        if (activeRef || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
        const target = event.target as HTMLElement
        const current = target.matches?.(ROW_SELECTOR) ? target.dataset.rowKey : undefined
        if (!current) return
        const action = treeKeyAction(flatRows, current, event.key, collapsedIds)
        if (!action) return
        event.preventDefault()
        if (action.type === "focus") focusRow(action.key)
        else if (action.type === "expand") onExpandFolder(action.folderId)
        else onToggleFolder(action.folderId)
    }

    return (
        <TreeHoverStoreContext.Provider value={hoverStore}>
        <TreeTabStopContext.Provider value={tabStopStore}>
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
            <TreeBackgroundMenu allCollapsed={allCollapsed} onToggleAll={onToggleAll} hasFolders={tree.rootFolders.length > 0}>
            <RootDropArea rootRef={rootElRef} treeLabel={isEmpty ? undefined : t("sidebar.treeLabel")} onFocus={handleTreeFocus} onKeyDown={handleTreeKeyDown}>
                {isEmpty ? (
                    <EmptyTree />
                ) : virtualized ? (
                    <TabStopVirtualTree
                        tabStopStore={tabStopStore}
                        rows={flatRows}
                        collapsedIds={collapsedIds}
                        onToggleFolder={onToggleFolder}
                        activeKey={activeRef ? treeRowKey(activeRef.type, activeRef.id) : null}
                        getScrollElement={getScrollElement}
                        handleRef={virtualRef}
                    />
                ) : (
                    <>
                        {tree.rootFolders.map((folder) => (
                            <FileTreeItem
                                key={`folder-${folder.id}`}
                                item={folder}
                                collapsedIds={collapsedIds}
                                onToggleFolder={onToggleFolder}
                            />
                        ))}
                        {tree.rootNotes.map((note) => (
                            <FileTreeItem
                                key={`note-${note.id}`}
                                item={note}
                                collapsedIds={collapsedIds}
                                onToggleFolder={onToggleFolder}
                            />
                        ))}
                    </>
                )}
            </RootDropArea>
            </TreeBackgroundMenu>
            <DragOverlay dropAnimation={null}>
                {activeItem && activeRef ? <div className="rotate-2"><DragPreview item={activeItem} count={multiCount} /></div> : null}
            </DragOverlay>
        </DndContext>
        </TreeTabStopContext.Provider>
        </TreeHoverStoreContext.Provider>
    )
}
