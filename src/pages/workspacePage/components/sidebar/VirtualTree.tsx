import { useCallback, useMemo } from "react"
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import { ItemNote } from "../note/Note"
import { ItemFolder } from "../folder/Folder"
import type { DropZone } from "./tree-dnd"
import type { FlatRow } from "./flat-tree"
import { useItemSize } from "./item-size"

/** Vertical gap between rows (gap-1 in the recursive layout). */
const ROW_GAP = 4
const OVERSCAN = 10

type VirtualTreeProps = {
    rows: FlatRow[]
    collapsedIds: Set<number>
    onToggleFolder: (folderId: number) => void
    overKey: string | null
    overZone: DropZone | null
    /** Key of the row being dragged: it stays mounted even when scrolled out of the range. */
    activeKey: string | null
    getScrollElement: () => HTMLElement | null
}

/** Flat, virtualized rendering of the tree; only the rows near the viewport are in the DOM. */
export const VirtualTree = ({ rows, collapsedIds, onToggleFolder, overKey, overZone, activeKey, getScrollElement }: VirtualTreeProps) => {
    const size = useItemSize()
    const rowSize = size.rowPx + ROW_GAP

    const activeIndex = useMemo(
        () => activeKey ? rows.findIndex(row => row.key === activeKey) : -1,
        [rows, activeKey],
    )

    const rangeExtractor = useCallback((range: Range) => {
        const indexes = defaultRangeExtractor(range)
        if (activeIndex < 0 || activeIndex >= range.count || indexes.includes(activeIndex)) return indexes
        return [...indexes, activeIndex].sort((a, b) => a - b)
    }, [activeIndex])

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement,
        estimateSize: () => rowSize,
        overscan: OVERSCAN,
        rangeExtractor,
        getItemKey: (index) => rows[index]?.key ?? index,
    })

    return (
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) return null
                const dropZone = overKey === row.key ? overZone : null
                return (
                    <div
                        key={row.key}
                        data-testid="tree-row"
                        className="absolute left-0 top-0 w-full"
                        style={{
                            height: size.rowPx,
                            transform: `translateY(${virtualRow.start}px)`,
                            paddingLeft: row.depth * size.indentPx,
                        }}
                    >
                        {row.kind === "folder" ? (
                            <ItemFolder
                                folder={row.item}
                                isOpen={!collapsedIds.has(row.item.id)}
                                onToggle={onToggleFolder}
                                dropZone={dropZone}
                            />
                        ) : (
                            <ItemNote note={row.item} dropZone={dropZone} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
