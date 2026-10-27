import { useCallback, useImperativeHandle, useMemo, type Ref } from "react"
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual"
import { ItemNote } from "../note/Note"
import { ItemFolder } from "../folder/Folder"
import type { FlatRow } from "./flat-tree"
import { useItemSize } from "./item-size"

/** Vertical gap between rows (gap-1 in the recursive layout). */
const ROW_GAP = 4
const OVERSCAN = 10

/** What the tree can be asked to do from outside. */
export type VirtualTreeHandle = {
    /** Scrolls the row with this key into view (false when there is no such row). */
    scrollToKey: (key: string) => boolean
}

type VirtualTreeProps = {
    rows: FlatRow[]
    collapsedIds: Set<number>
    onToggleFolder: (folderId: number) => void
    /** Key of the row being dragged: it stays mounted even when scrolled out of the range. */
    activeKey: string | null
    /** Key of the row in the tab order: it stays mounted too, so the keyboard can always get into the tree. */
    tabStopKey?: string | null
    getScrollElement: () => HTMLElement | null
    handleRef?: Ref<VirtualTreeHandle>
}

/** Flat, virtualized rendering of the tree; only the rows near the viewport are in the DOM. */
export const VirtualTree = ({ rows, collapsedIds, onToggleFolder, activeKey, tabStopKey = null, getScrollElement, handleRef }: VirtualTreeProps) => {
    const size = useItemSize()
    const rowSize = size.rowPx + ROW_GAP

    const activeIndex = useMemo(
        () => activeKey ? rows.findIndex(row => row.key === activeKey) : -1,
        [rows, activeKey],
    )

    const tabStopIndex = useMemo(
        () => tabStopKey ? rows.findIndex(row => row.key === tabStopKey) : -1,
        [rows, tabStopKey],
    )

    const rangeExtractor = useCallback((range: Range) => {
        const indexes = defaultRangeExtractor(range)
        const missing = [activeIndex, tabStopIndex].filter(index => index >= 0 && index < range.count && !indexes.includes(index))
        if (missing.length === 0) return indexes
        return [...new Set([...indexes, ...missing])].sort((a, b) => a - b)
    }, [activeIndex, tabStopIndex])

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement,
        estimateSize: () => rowSize,
        overscan: OVERSCAN,
        rangeExtractor,
        getItemKey: (index) => rows[index]?.key ?? index,
    })

    useImperativeHandle(handleRef, () => ({
        scrollToKey: (key) => {
            const index = rows.findIndex(row => row.key === key)
            if (index < 0) return false
            virtualizer.scrollToIndex(index, { align: "auto" })
            return true
        },
    }), [rows, virtualizer])

    return (
        <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                if (!row) return null
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
                        {/* One guide per ancestor level, under the chevron of its folder; it also crosses the gap above the row so the lines are continuous */}
                        {Array.from({ length: row.depth }, (_, level) => (
                            <span
                                key={level}
                                aria-hidden="true"
                                data-testid="tree-guide"
                                className="pointer-events-none absolute w-px bg-foreground/20"
                                style={{ left: level * size.indentPx + size.guidePx, top: -ROW_GAP, height: size.rowPx + ROW_GAP }}
                            />
                        ))}
                        {row.kind === "folder" ? (
                            <ItemFolder
                                folder={row.item}
                                isOpen={!collapsedIds.has(row.item.id)}
                                onToggle={onToggleFolder}
                                level={row.depth + 1}
                            />
                        ) : (
                            <ItemNote note={row.item} level={row.depth + 1} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
