import type { Workspace } from "@/types"
import { WorkSpaceItem } from "./WorkSpaceItem"

type WorkspacesContainerProps = {
    workspaces: Workspace[]
}

export const WorkspacesContainer = ({ workspaces }: WorkspacesContainerProps) => {
    return (
        <div className="grid grid-cols-2 w-full overflow-y-auto h-[200px] lg:h-[350px] gap-1 transition- content-start">
            {workspaces.length > 0 ? (
                workspaces.map((ws) => (
                    <WorkSpaceItem
                        key={ws.id}
                        workspace={ws}
                    />
                ))
            ) : (
                <h1 className="text-muted-foreground text-sm w-full">
                    Nessun workspace trovato
                </h1>
            )}
        </div>
    )
}