import { useTranslation } from "react-i18next"
import type { Workspace } from "@/types/types"
import { useWorkspace } from "@/contexts/use-workspace"
import { useNavigate } from "react-router-dom"
import { ButtonMenuWorkspace } from "./ButtonMenuWorkspace"
import { ItemMenuButton } from "@/components/item-menu"
import React from "react"
import { cn, formatDate } from "@/lib/utils"
import { focusRing } from "@/lib/a11y"
import { useInlineRename } from "@/hooks/use-inline-rename"
import { InlineNameInput } from "@/components/inline-name-input"

type WorkSpaceItemProps = {
    workspace: Workspace
    view?: "grid" | "list"
}

export const WorkSpaceItem = React.memo(({ workspace, view = "grid" }: WorkSpaceItemProps) => {
    const { t } = useTranslation()
    const { setCurrentWorkspace, getWorkspaces } = useWorkspace()
    const { editing, error, start: startRename, inputProps } = useInlineRename({ itemType: "workspace", id: workspace.id, name: workspace.name, reload: getWorkspaces })
    const nameInput = (className?: string) => <InlineNameInput {...inputProps} error={error} aria-label={t("common.name")} className={className} />
    const navigate = useNavigate()

    const formattedCreationDate = formatDate(workspace.creation_date)
    const formattedEditDate = formatDate(workspace.edit_date)

    const handleOpen = () => {
        setCurrentWorkspace(workspace)
        navigate(`/workspace/${workspace.id}`)
    }

    const isList = view === "list"

    return (
        <ButtonMenuWorkspace workspace={workspace} onRename={startRename}>
            <div className={cn("group relative flex items-center w-full bg-background hover:border-primary/60 border rounded-xs", isList ? "h-11 shrink-0" : "h-24")}>
                <button
                    type="button"
                    onClick={handleOpen}
                    aria-label={t("home.workspace.open", { name: workspace.name })}
                    title={workspace.name}
                    className={cn("absolute inset-0 cursor-pointer rounded-xs", focusRing)} />

                {/* Color Container */}
                {workspace.color && <div
                    className="w-2 h-full absolute rounded-l-[0.5px] bg-background"
                    style={{ backgroundColor: workspace.color }}
                />}

                {/* Workspace Info */}
                {isList ? (
                    <div className="pointer-events-none flex items-center justify-between gap-2 pl-4 pr-2 w-full min-w-0">
                        {editing ? nameInput() : <span className="text-foreground text-base truncate whitespace-nowrap min-w-0">
                            {workspace.name}
                        </span>}
                        <span className="text-muted-foreground text-xs whitespace-nowrap shrink-0 mr-8 max-w-[45%] truncate">
                            {formattedEditDate} - {workspace.edit_time}
                        </span>
                    </div>
                ) : (
                    <div className="pointer-events-none flex flex-col justify-between py-2 pl-4 pr-2 relative w-full min-w-0">
                        {editing ? nameInput("flex-none h-8 w-[calc(100%-2rem)] text-xl md:text-xl") : <span className="text-foreground text-xl truncate overflow-hidden whitespace-nowrap mr-8">
                            {workspace.name}
                        </span>}
                        <div className="flex flex-col items-start gap-1 w-full">
                            <span className="text-muted-foreground text-sm max-w-full truncate" title={t("common.creationDate", { date: formattedCreationDate, time: workspace.creation_time })}>
                                {t("common.creationDate", { date: formattedCreationDate, time: workspace.creation_time })}
                            </span>
                            <span className="text-muted-foreground text-sm max-w-full truncate" title={t("common.editDate", { date: formattedEditDate, time: workspace.edit_time })}>
                                {t("common.editDate", { date: formattedEditDate, time: workspace.edit_time })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Menu Button */}
                <div className={cn("absolute right-1 flex items-center justify-center opacity-60 group-hover:opacity-100 focus-within:opacity-100", isList ? "top-1/2 -translate-y-1/2" : "top-1")}>
                    <ItemMenuButton className="hover:bg-accent" name={workspace.name} />
                </div>
            </div>
        </ButtonMenuWorkspace>
    )
})
