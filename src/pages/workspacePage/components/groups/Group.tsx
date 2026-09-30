import type { Group as GroupType } from "@/types/types"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"
import { Section } from "../section/Section"
import { AddSection } from "../section/AddSection"
import { GroupHeader } from "./GroupHeader"
import { cn } from "@/lib/utils"
import { useNoteDrop } from "../note-dnd-state"
import { GroupAudioFiles } from "./GroupAudioFiles"

type GroupProps = {
    dragHandleProps?: DraggableProvidedDragHandleProps | null
    group: GroupType
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
}

export const Group = ({ dragHandleProps, group, index = 0 }: GroupProps) => {
    // The empty area of a group (and its header) accepts a dragged section: it is appended to the group
    const { setNodeRef, zone } = useNoteDrop("group", group.id)

    return (
        <div
            ref={setNodeRef}
            className={cn("flex flex-col gap-1 h-full rounded-xs", zone && "ring-2 ring-primary")}
        >
            <GroupHeader
                group={group}
                index={index}
                dragHandleProps={dragHandleProps}
            />
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
        </div>
    )
}
