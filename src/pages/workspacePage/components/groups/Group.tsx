import type { Group as GroupType } from "@/types/types"
import { Section } from "../section/Section"
import { AddSection } from "../section/AddSection"

type GroupProps = {
    dragHandleProps?: any
    group: GroupType
}

export const Group = ({ dragHandleProps, group }: GroupProps) => {

    return (
        <div className="flex flex-col gap-1"
        >
            <>
                {group.sections.map((section, index) => (
                    <Section
                        key={section.id}
                        section={section}
                        dragHandleProps={index === 0 ? dragHandleProps : undefined} />
                ))}
            </>
            <AddSection inGroup groupId={group.id} />
        </div>
    )
}