import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"
import { cn } from "@/lib/utils"

type WorkspacesContainerProps = {
    workspaces: Workspace[]
    view?: "grid" | "list"
}

export const WorkspacesContainer = ({ workspaces, view = "grid" }: WorkspacesContainerProps) => {
    return (
        <div className={cn(
            "grid w-full overflow-y-auto h-[200px] lg:h-[350px] gap-1 content-start",
            view === "grid" ? "grid-cols-2" : "grid-cols-1"
        )}>
            {workspaces.length > 0 ? (
                workspaces.map((ws) => (
                    <WorkSpaceItem
                        key={ws.id}
                        workspace={ws}
                        view={view}
                    />
                ))
            ) : (
                <p className="text-muted-foreground text-sm w-full">
                    Nessun workspace trovato
                </p>
            )}
        </div>
    )
}