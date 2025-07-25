import type { Workspace } from "@/types/types"
import { useWorkspace } from "@/contexts/workspace-context"
import { useNavigate } from "react-router-dom"
import { ButtonMenuWorkspace } from "./ButtonMenuWorkspace"
import React from "react"

type WorkSpaceItemProps = {
    workspace: Workspace
}

export const WorkSpaceItem = React.memo(({ workspace }: WorkSpaceItemProps) => {
    const { setCurrentWorkspace } = useWorkspace()
    const navigate = useNavigate()

    function formatDate(dateStr: string) {
        if (!dateStr) return ""
        const [year, month, day] = dateStr.split("-")
        return `${day}-${month}-${year}`
    }

    const formattedCreationDate = formatDate(workspace.creation_date)
    const formattedEditDate = formatDate(workspace.edit_date)

    const handleOpen = () => {
        setCurrentWorkspace(workspace)
        navigate(`/workspace/${workspace.id}`)
    }

    return (
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
                <ButtonMenuWorkspace
                    workspace={workspace}
                />
            </div>
        </div>
    )
})