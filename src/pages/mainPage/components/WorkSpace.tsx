import type { Workspace } from "@/types/types"
import { useWorkspace } from "@/contexts/use-workspace"
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
                <div className="group relative flex items-center w-full h-11 shrink-0 bg-background hover:bg-secondary border rounded-xs">
                    <button
                        type="button"
                        onClick={handleOpen}
                        aria-label={`Apri il workspace ${workspace.name}`}
                        className="absolute inset-0 cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />

                    {/* Color Container */}
                    {workspace.color && <div
                        className="w-2 h-full absolute rounded-l-[0.5px] bg-background"
                        style={{ backgroundColor: workspace.color }}
                    />}

                    {/* Workspace Info */}
                    <div className="pointer-events-none flex items-center justify-between gap-2 pl-4 pr-2 w-full min-w-0">
                        <span className="text-muted-foreground group-hover:text-foreground text-base truncate whitespace-nowrap min-w-0">
                            {workspace.name}
                        </span>
                        <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mr-8">
                            {formattedEditDate} - {workspace.edit_time}
                        </span>
                    </div>

                    {/* Menu Button */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <ItemMenuButton className="hover:bg-accent" />
                    </div>
                </div>
            </ButtonMenuWorkspace>
        )
    }

    return (
        <ButtonMenuWorkspace workspace={workspace}>
            <div className="group relative flex items-center w-full h-24 bg-background hover:bg-secondary border rounded-xs">
                <button
                    type="button"
                    onClick={handleOpen}
                    aria-label={`Apri il workspace ${workspace.name}`}
                    className="absolute inset-0 cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />

                {/* Color Container */}
                {workspace.color && <div
                    className="w-2 h-full absolute rounded-l-[0.5px] bg-background"
                    style={{ backgroundColor: workspace.color }}
                />}

                {/* Workspace Info */}
                <div className="pointer-events-none flex flex-col justify-between p-2 ml-2 relative w-full">
                    <span className="text-muted-foreground group-hover:text-foreground text-xl truncate overflow-hidden whitespace-nowrap mr-8">
                        {workspace.name}
                    </span>
                    <div className="flex flex-col items-start gap-1 w-full">
                        <span className="text-muted-foreground text-sm">
                            Creato il: {formattedCreationDate} - {workspace.creation_time}
                        </span>
                        <span className="text-muted-foreground text-sm">
                            Modificato il: {formattedEditDate} - {workspace.edit_time}
                        </span>
                    </div>
                </div>

                {/* Menu Button */}
                <div className="absolute right-1 top-1 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <ItemMenuButton className="hover:bg-accent" />
                </div>
            </div>
        </ButtonMenuWorkspace>
    )
})