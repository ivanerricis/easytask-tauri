import type { Group as GroupType } from "@/types/types"
import { Section } from "../section/Section"
import { AddSection } from "../section/AddSection"
import { GroupHeader } from "./GroupHeader"

type GroupProps = {
    dragHandleProps?: any
    group: GroupType
}

export const Group = ({ dragHandleProps, group }: GroupProps) => {

    return (
        <div className="flex flex-col gap-1 h-full"
        >
            <GroupHeader
                group={group}
                dragHandleProps={dragHandleProps}
            />
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