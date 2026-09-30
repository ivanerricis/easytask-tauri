import { useCallback } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import type { DropZone, TreeItemType } from "./tree-dnd"

export const treeRowKey = (type: TreeItemType, id: number) => `${type}-${id}`

// A click is fired on the source row when a drag is released over it; ignore it.
let lastDragEnd = 0
export const markTreeDragEnd = () => { lastDragEnd = Date.now() }
export const wasTreeJustDragged = () => Date.now() - lastDragEnd < 150

/** Makes a row both draggable and droppable, sharing the same DOM node. */
export function useTreeRow(type: TreeItemType, id: number) {
    const key = treeRowKey(type, id)
    const data = { type, id }
    const { setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({ id: key, data })
    const { setNodeRef: setDropRef } = useDroppable({ id: key, data })

    const ref = useCallback((node: HTMLElement | null) => {
        setDragRef(node)
        setActivatorNodeRef(node)
        setDropRef(node)
    }, [setDragRef, setActivatorNodeRef, setDropRef])

    return { ref, attributes, listeners, isDragging }
}

export const isInsideZone = (zone: DropZone | null) => zone === "inside" || zone === "inside-start"

/** Stops row drag activation from events coming from the row's menu (also from its portal). */
export const stopDragActivation = {
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
}
