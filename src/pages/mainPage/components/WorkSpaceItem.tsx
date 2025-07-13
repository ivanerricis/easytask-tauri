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

    const handleOpen = () => {
        setCurrentWorkspace(workspace);
        getWorkspaceData(workspace.id)
        navigate(`/workspace/${workspace.id}`)
    }

    return (
        <div className="group flex flex-col items-center w-full h-24 bg-background hover:bg-secondary border rounded-xs">
            <div className="flex items-center justify-between w-full relative h-full">
                {/* Workspace Info */}
                <div
                    role="button"
                    className="flex flex-col justify-between p-2 relative cursor-pointer"
                    onClick={handleOpen}
                >
                    <h1 className="text-muted-foreground group-hover:text-foreground text-xl transition-all truncate overflow-hidden whitespace-nowrap mr-8">
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

                {/* Color Bar */}
                <div
                    className="w-3 h-full rounded-e-[1px] border-l"
                    style={{ backgroundColor: workspace.color }}
                />

                {/* Menu Button */}
                <div className="flex items-center justify-center right-5 top-1 absolute opacity-0 group-hover:opacity-100 hover:bg-background rounded-xs p-1 transition-all">
                    <ButtonMenu workspace={workspace} />
                </div>
            </div>
        </div>
    )
}