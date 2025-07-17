import { Section } from "../section/Section"
import { AddSectionInGroup } from "../section/AddSectionInGroup"
import type { Group as GroupType } from "@/types/types"

type GroupProps = {
    dragHandleProps?: any
    group: GroupType
}

export const Group = ({ dragHandleProps, group }: GroupProps) => {

    return (
        <div className="flex flex-col gap-2"
        >
            <>
                {group.sections.map((section, index) => (
                    <Section
                        key={section.id}
                        section={section}
                        dragHandleProps={index === 0 ? dragHandleProps : undefined} />
                ))}
            </>
            <AddSectionInGroup groupId={group.id} />
        </div>
    )
}