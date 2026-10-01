import { useTranslation } from "react-i18next"
import type { Workspace } from "@/types/types"
import { WorkSpaceItem } from "./WorkSpace"
import { EmptyState } from "@/components/empty-state"
import { cn } from "@/lib/utils"

type WorkspacesContainerProps = {
    workspaces: Workspace[]
    view?: "grid" | "list"
}

export const WorkspacesContainer = ({ workspaces, view = "grid" }: WorkspacesContainerProps) => {
    const { t } = useTranslation()
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
                <EmptyState
                    className="col-span-full"
                    title={t("home.noWorkspaces")}
                    description={t("emptyStates.workspaces.description")}
                    hints={[{ label: t("emptyStates.workspaces.create"), shortcutId: "new-workspace" }]}
                />
            )}
        </div>
    )
}