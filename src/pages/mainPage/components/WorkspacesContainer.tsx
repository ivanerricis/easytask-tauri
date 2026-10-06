import { useTranslation } from "react-i18next"
import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { DEFAULT_WORKSPACE_SORT, type WorkspaceSort } from "@/lib/store/preferences"
import { sortWorkspaces } from "./sort-workspaces"

type WorkspacesContainerProps = {
    workspaces: Workspace[]
    view?: "grid" | "list"
    sort?: WorkspaceSort
}

export const WorkspacesContainer = ({ workspaces, view = "grid", sort = DEFAULT_WORKSPACE_SORT }: WorkspacesContainerProps) => {
    const { t } = useTranslation()
    const sorted = useMemo(() => sortWorkspaces(workspaces, sort), [workspaces, sort])
    return (
        <div className={cn(
            "grid w-full overflow-y-auto h-[200px] lg:h-[350px] gap-1 content-start",
            view === "grid" ? "grid-cols-2" : "grid-cols-1"
        )}>
            {workspaces.length > 0 ? (
                sorted.map((ws) => (
                    <WorkSpaceItem
                        key={ws.id}
                        workspace={ws}
                        view={view}
                    />
                ))
            ) : (
                <p className="text-muted-foreground text-sm w-full">
                    {t("home.noWorkspaces")}
                </p>
            )}
        </div>
    )
}