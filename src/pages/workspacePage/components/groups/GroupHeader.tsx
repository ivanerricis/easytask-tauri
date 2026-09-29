import { usePreferences } from "@/contexts/preferences-context"
import { Grip, LayoutList, SquareCheckBig } from "lucide-react"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import type { Group } from "@/types/types"
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd"

type GroupHeaderProps = {
    group: Group
    dragHandleProps?: DraggableProvidedDragHandleProps | null
}

export const GroupHeader = ({ group, dragHandleProps }: GroupHeaderProps) => {
    const { showSectionCount, showTaskCount } = usePreferences()

    return (
        <div className="group flex items-center justify-between border px-2 py-1 bg-background hover:bg-secondary w-full rounded-xs">
            {dragHandleProps && <div className="group flex items-center justify-center" {...dragHandleProps}>
                <Grip className="text-muted-foreground group-hover:text-foreground w-4 h-4 mr-3" />
            </div>}
            <div className="flex w-full gap-3">
                {showSectionCount && <div className="flex items-center gap-1">
                    <LayoutList className="size-4" />
                    <h1 className="text-xs">
                        {group.sections.length}
                    </h1>
                </div>}
                {showTaskCount && <div className="flex items-center gap-1">
                    <SquareCheckBig className="size-4" />
                    <h1 className="text-xs">
                        {group.sections.reduce((sum, section) => sum + section.tasks.length, 0)}
                    </h1>
                </div>}
            </div>
            <div className="opacity-0 group-hover:opacity-100">
                <ButtonMenuGroup group={group} />
            </div>
        </div>
    )
}