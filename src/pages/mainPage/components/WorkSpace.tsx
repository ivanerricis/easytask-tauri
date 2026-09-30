import type { Workspace } from "@/types/types"
import { useWorkspace } from "@/contexts/workspace-context"
import { useNavigate } from "react-router-dom"
import { ButtonMenuWorkspace } from "./ButtonMenuWorkspace"
import { ItemMenuButton } from "@/components/item-menu"
import React from "react"
import { formatDate } from "@/lib/utils"

type WorkSpaceItemProps = {
    workspace: Workspace
    view?: "grid" | "list"
}

export const WorkSpaceItem = React.memo(({ workspace, view = "grid" }: WorkSpaceItemProps) => {
    const { setCurrentWorkspace } = useWorkspace()
    const navigate = useNavigate()

    const formattedCreationDate = formatDate(workspace.creation_date)
    const formattedEditDate = formatDate(workspace.edit_date)

    const handleOpen = () => {
        setCurrentWorkspace(workspace)
        navigate(`/workspace/${workspace.id}`)
    }

    if (view === "list") {
        return (
            <ButtonMenuWorkspace workspace={workspace}>
                <div
                    role="button"
                    onClick={handleOpen}
                    className="group relative flex items-center w-full cursor-pointer h-11 shrink-0 bg-background hover:bg-secondary border rounded-xs">

                    {/* Color Container */}
                    {workspace.color && <div
                        className="w-2 h-full absolute rounded-l-[0.5px] bg-background"
                        style={{ backgroundColor: workspace.color }}
                    />}

                    {/* Workspace Info */}
                    <div className="flex items-center justify-between gap-2 pl-4 pr-2 w-full min-w-0">
                        <h1 className="text-muted-foreground group-hover:text-foreground text-base truncate whitespace-nowrap min-w-0">
                            {workspace.name}
                        </h1>
                        <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mr-8">
                            {formattedEditDate} - {workspace.edit_time}
                        </span>
                    </div>

                    {/* Menu Button */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ItemMenuButton className="hover:bg-accent" />
                    </div>
                </div>
            </ButtonMenuWorkspace>
        )
    }

    return (
        <ButtonMenuWorkspace workspace={workspace}>
            <div
                role="button"
                onClick={handleOpen}
                className="group relative flex items-center w-full cursor-pointer h-24 bg-background hover:bg-secondary border rounded-xs">

                {/* Color Container */}
                {workspace.color && <div
                    className="w-2 h-full absolute rounded-l-[0.5px] bg-background"
                    style={{ backgroundColor: workspace.color }}
                />}

                {/* Workspace Info */}
                <div className="flex flex-col justify-between p-2 ml-2 relative w-full">
                    <h1 className="text-muted-foreground group-hover:text-foreground text-xl truncate overflow-hidden whitespace-nowrap mr-8">
                        {workspace.name}
                    </h1>
                    <div className="flex flex-col items-start gap-1 w-full">
                        <h1 className="text-muted-foreground text-sm">
                            Creato il: {formattedCreationDate} - {workspace.creation_time}
                        </h1>
                        <h1 className="text-muted-foreground text-sm">
                            Modificato il: {formattedEditDate} - {workspace.edit_time}
                        </h1>
                    </div>
                </div>

                {/* Menu Button */}
                <div className="absolute right-1 top-1 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ItemMenuButton className="hover:bg-accent" />
                </div>
            </div>
        </ButtonMenuWorkspace>
    )
})