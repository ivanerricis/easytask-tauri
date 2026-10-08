import { useTranslation } from "react-i18next"
import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { DEFAULT_WORKSPACE_SORT, type WorkspaceSort } from "@/lib/store/preferences"
import { sortWorkspaces } from "./sort-workspaces"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FolderOpen } from "lucide-react"

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
            "grid w-full overflow-y-auto h-[clamp(200px,42vh,420px)] gap-1 content-start",
            view === "grid" ? "grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))]" : "grid-cols-1"
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
                <Empty className="col-span-full">
                    <EmptyHeader>
                        <EmptyMedia variant="icon"><FolderOpen /></EmptyMedia>
                        <EmptyTitle>{t("home.noWorkspaces")}</EmptyTitle>
                        <EmptyDescription>{t("home.noWorkspacesHint")}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
        </div>
    )
}