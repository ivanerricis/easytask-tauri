import type { Workspace } from "@/types"
import { useWorkspace } from "@/contexts/workspace-context"
import { useNavigate } from "react-router-dom"
import { ButtonMenu } from "./ButtonMenu"
import { useWorkspaceData } from "@/contexts/workspace-data-context"

type WorkSpaceItemProps = {
    workspace: Workspace
}

export const WorkSpaceItem = ({ workspace }: WorkSpaceItemProps) => {
    const { setCurrentWorkspace } = useWorkspace()
    const { getWorkspaceData } = useWorkspaceData()
    const navigate = useNavigate()

    const handleOpen = async () => {
        setCurrentWorkspace(workspace)
        await getWorkspaceData(workspace.id)
        navigate(`/workspace/${workspace.id}`)
    }

    return (
        <div role="button" onClick={handleOpen} className="group relative flex items-center w-full cursor-pointer h-24 bg-background hover:bg-secondary border rounded-xs">

            {/* Color Bar */}
            {workspace.color && <div
                className="w-2 h-full rounded-l-[0.5px] bg-background"
                style={{ backgroundColor: workspace.color }}
            />}

            {/* Workspace Info */}
            <div className="flex flex-col justify-between p-2 relative w-full">
                <h1 className="text-muted-foreground group-hover:text-foreground text-xl truncate overflow-hidden whitespace-nowrap mr-8">
                    {workspace.name}
                </h1>
                <div className="flex flex-col items-start gap-1 w-full">
                    <h1 className="text-muted-foreground text-sm">
                        Creato il: {workspace.creation_date} - {workspace.creation_time}
                    </h1>
                    <h1 className="text-muted-foreground text-sm">
                        Modificato il: {workspace.edit_date} - {workspace.edit_time}
                    </h1>
                </div>
            </div>

            {/* Menu Button */}
            <ButtonMenu workspace={workspace} />
        </div>
    )
}