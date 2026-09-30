import type { Group as GroupType } from "@/types/types"
import { useCallback, type HTMLAttributes } from "react"
import { Section } from "../section/Section"
import { AddSection } from "../section/AddSection"
import { GroupHeader } from "./GroupHeader"
import { cn } from "@/lib/utils"
import { useNoteDrag, useNoteDrop } from "../note-dnd-state"
import { GroupAudioFiles } from "./GroupAudioFiles"
import { useGroupOpen } from "@/contexts/use-tabs"

type GroupProps = {
    group: GroupType
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
}

export const Group = ({ group, index = 0 }: GroupProps) => {
    // The empty area of a group (and its header) accepts a dragged section: it is appended to the group
    const { setNodeRef: setDropRef, zone, active } = useNoteDrop("group", group.id)
    // The group is also draggable (by the grip of its header) to reorder the groups
    const { setNodeRef: setDragRef, setActivatorNodeRef, attributes, listeners, isDragging } = useNoteDrag("group", group.id)
    const setRef = useCallback((node: HTMLElement | null) => {
        setDropRef(node)
        setDragRef(node)
    }, [setDropRef, setDragRef])
    const draggingGroup = active?.kind === "group"
    const [isOpen] = useGroupOpen(group.id)

    return (
        <div
            ref={setRef}
            className={cn(
                "relative flex flex-col gap-1 h-full rounded-xs",
                isDragging && "opacity-40",
                !draggingGroup && zone && "ring-2 ring-primary",
            )}
        >
            {draggingGroup && (zone === "before" || zone === "after") &&
                <div className={cn("pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-primary", zone === "before" ? "-left-[5px]" : "-right-[5px]")} />}
            <GroupHeader
                group={group}
                index={index}
                dragHandleRef={setActivatorNodeRef}
                dragHandleProps={{ ...attributes, ...listeners } as HTMLAttributes<HTMLDivElement>}
            />
            {isOpen && <>
                <GroupAudioFiles groupId={group.id} />
                <div className="flex flex-col gap-1 overflow-y-auto">
                    {group.sections.map((section) => (
                        <Section
                            key={section.id}
                            section={section}
                        />
                    ))}
                </div>
                <AddSection inGroup groupId={group.id} />
            </>}
        </div>
    )
}
