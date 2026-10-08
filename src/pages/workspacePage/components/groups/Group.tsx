import type { Group as GroupType } from "@/types/types"
import { memo, useCallback, useLayoutEffect, useRef } from "react"
import { Section } from "../section/Section"
import { AddSection } from "../section/AddSection"
import { GroupHeader } from "./GroupHeader"
import { cn } from "@/lib/utils"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import { GroupAudioFiles } from "./GroupAudioFiles"
import { useGroupOpen } from "@/contexts/use-tabs"
import { DropLine } from "../sidebar/DropLine"

type GroupProps = {
    group: GroupType
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
    /** Number of audio files of the group, shown in the header. */
    audioCount?: number
}

/**
 * Last width of each group while it was open. A group is as wide as its widest section (or its header), so it would
 * shrink to the header as soon as it is collapsed: the collapsed group keeps this width instead.
 */
const openWidths = new Map<number, number>()

export const Group = memo(({ group, index = 0, audioCount = 0 }: GroupProps) => {
    // The empty area of a group (and its header) accepts a dragged section: it is appended to the group
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("group", group.id)
    // The group is also draggable (by its header) to reorder the groups
    const { setNodeRef: setDragRef, dragProps, isDragging } = useNoteDrag("group", group.id)
    const nodeRef = useRef<HTMLElement | null>(null)
    const setRef = useCallback((node: HTMLElement | null) => {
        nodeRef.current = node
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])
    const draggingGroup = active?.kind === "group"
    const [isOpen] = useGroupOpen(group.id)

    // While open, follow the width of the group (its content can grow or shrink); the cleanup runs before the
    // sections are removed from the DOM, so the width of the collapsed group is never recorded
    useLayoutEffect(() => {
        const node = nodeRef.current
        if (!node || !isOpen) return
        const record = () => { openWidths.set(group.id, node.getBoundingClientRect().width) }
        record()
        const observer = new ResizeObserver(record)
        observer.observe(node)
        return () => observer.disconnect()
    }, [isOpen, group.id])

    return (
        <div
            ref={setRef}
            style={isOpen ? undefined : { minWidth: openWidths.get(group.id) }}
            className={cn(
                // Same minimum width as a section: an empty group would otherwise shrink to "Nuova sezione" and clip its header.
                // Readable column: at most 32rem, so long task texts and audio names wrap or truncate instead of widening it
                "relative flex flex-col gap-1 h-full min-w-[250px] max-w-[32rem] rounded-xs",
                isDragging && "opacity-40",
                !draggingGroup && zone && "ring-2 ring-primary",
            )}
        >
            {draggingGroup && <DropLine zone={zone} vertical className={zone === "before" ? "-left-[5px] z-30" : "-right-[5px] z-30"} />}
            <GroupHeader
                group={group}
                index={index}
                audioCount={audioCount}
                dragProps={dragProps}
            />
            {isOpen && <>
                <GroupAudioFiles groupId={group.id} />
                <div className="flex flex-col gap-1 overflow-y-auto">
                    {group.sections.map(section => <Section key={section.id} section={section} />)}
                </div>
                <AddSection inGroup groupId={group.id} />
            </>}
        </div>
    )
})
