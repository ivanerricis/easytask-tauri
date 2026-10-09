import { useTranslation } from "react-i18next"
import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { DEFAULT_WORKSPACE_SORT, type WorkspaceSort } from "@/lib/store/preferences"
import { sortWorkspaces } from "./sort-workspaces"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { FolderOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedFlag } from "@/hooks/use-delayed-flag"

type WorkspacesContainerProps = {
    workspaces: Workspace[]
    view?: "grid" | "list"
    sort?: WorkspaceSort
    /** The list is not loaded yet: cards shaped like the workspaces of the current view are drawn instead. */
    loading?: boolean
}

/** A workspace card (grid) or row (list) while the list loads. */
const WorkspaceSkeleton = ({ view }: { view: "grid" | "list" }) => view === "list" ? (
    <div aria-hidden className="flex items-center justify-between gap-2 w-full h-11 shrink-0 pl-4 pr-10 border rounded-xs">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-24" />
    </div>
) : (
    <div aria-hidden className="flex flex-col justify-between w-full h-24 py-2 pl-4 pr-10 border rounded-xs">
        <Skeleton className="h-5 w-3/5" />
        <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
        </div>
    </div>
)

export const WorkspacesContainer = ({ workspaces, view = "grid", sort = DEFAULT_WORKSPACE_SORT, loading = false }: WorkspacesContainerProps) => {
    const { t } = useTranslation()
    const showSkeleton = useDelayedFlag(loading)
    const sorted = useMemo(() => sortWorkspaces(workspaces, sort), [workspaces, sort])
    return (
        <div className={cn(
            "grid w-full overflow-y-auto h-[clamp(200px,42vh,420px)] gap-1 content-start",
            view === "grid" ? "grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))]" : "grid-cols-1"
        )}>
            {loading ? (
                <>
                    {/* sr-only is absolutely positioned: it takes no cell of the grid */}
                    <span role="status" className="sr-only">{t("home.loading")}</span>
                    {showSkeleton && Array.from({ length: 6 }, (_, index) => <WorkspaceSkeleton key={index} view={view} />)}
                </>
            ) : workspaces.length > 0 ? (
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