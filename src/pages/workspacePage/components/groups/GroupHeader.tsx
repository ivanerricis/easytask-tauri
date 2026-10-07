import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { ChevronDown, FileAudio, LayoutList, SquareCheckBig } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useGroupOpen } from "@/contexts/use-tabs"
import { getGroupProgress } from "./group-progress"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import { ItemMenuButton } from "@/components/item-menu"
import type { Group } from "@/types/types"
import type { HTMLAttributes } from "react"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { withRollback } from "@/contexts/with-rollback"
import { useInlineEdit } from "@/hooks/use-inline-edit"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { getErrorMessage, hexToRgba } from "@/lib/utils"
import { getGroupLabel } from "./group-label"

type GroupHeaderProps = {
    group: Group
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
    /** Starts the drag of the group from the whole header (drag & drop inside the open note); omitted when not draggable. */
    dragProps?: HTMLAttributes<HTMLElement>
    /** Number of audio files of the group (the badge is hidden when 0). */
    audioCount?: number
}

export const GroupHeader = ({ group, index = 0, dragProps, audioCount = 0 }: GroupHeaderProps) => {
    const { t } = useTranslation()
    const { showSectionCount, showTaskCount, showAudioFileCount, showGroupProgressBar } = usePreferences()
    const colorAlpha = useColorAlpha()
    const [isOpen, toggleOpen] = useGroupOpen(group.id)
    const progress = getGroupProgress(group)
    const { renameItem } = useWorkspaceActions()
    const { patchGroup } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const name = group.name?.trim() ?? ""
    const label = getGroupLabel(group, index)
    // An empty text removes the name (a group can have none)
    const { editing: isEditing, error, start: startEditing, inputProps } = useInlineEdit({
        value: name,
        allowEmpty: true,
        errorMessage: err => t("groups.renameError", { message: getErrorMessage(err) }),
        onCommit: async next => {
            // Optimistic: the cached tree is updated at once and restored if the write fails
            await withRollback(patchGroup(group.id, { name: next || null }), () => renameItem("section_group", group.id, next))
            recorder.rename("section_group", group.id, group.name ?? "", next)
        },
    })

    return (
        <ButtonMenuGroup group={group}>
            <div
                // Everything stays on one row: the name is truncated (full name in the tooltip) and the progress bar shrinks
                className={`group flex items-center border px-2 py-1 w-full rounded-xs ${group.color ? "" : "bg-background hover:bg-secondary"} ${dragProps ? "touch-none cursor-grab active:cursor-grabbing" : ""}`}
                style={group.color ? { backgroundColor: hexToRgba(colorAlpha.header(), group.color) } : undefined}
                {...dragProps}>
                <button
                    type="button"
                    onClick={toggleOpen}
                    aria-label={isOpen ? t("groups.collapse") : t("groups.expand")}
                    aria-expanded={isOpen}
                    className="shrink-0 cursor-pointer mr-2 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ChevronDown className={`${isOpen ? "rotate-0" : "-rotate-90"} size-5`} />
                </button>
                {!isEditing && <button
                    type="button"
                    onClick={startEditing}
                    title={name ? label : undefined}
                    className={`text-sm font-semibold mr-2 flex-1 shrink-0 whitespace-nowrap cursor-text text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${name ? "" : "text-muted-foreground"}`}>
                    {label}
                </button>}
                {isEditing && <InlineErrorTooltip message={error}>
                    <input
                        {...inputProps}
                        onPointerDown={e => e.stopPropagation()}
                        type="text"
                        placeholder={label}
                        aria-label={t("groups.nameLabel")}
                        className={`min-w-0 flex-1 mr-2 px-1 border text-sm font-semibold rounded-xs ${error ? "border-destructive" : "border-primary"}`}
                    />
                </InlineErrorTooltip>}
                {showGroupProgressBar && progress.total > 0 && <div className="flex items-center gap-2 min-w-0 shrink mr-2">
                    <Progress className="w-16 min-w-4 shrink" value={progress.percent} />
                    <span className="text-xs shrink-0">
                        {Math.round(progress.percent)} %
                    </span>
                </div>}
                <div className="flex shrink-0 gap-2">
                    {showSectionCount && <div className="flex items-center gap-1">
                        <LayoutList className="size-4" />
                        <span className="text-xs">
                            {group.sections.length}
                        </span>
                    </div>}
                    {showTaskCount && <div className="flex items-center gap-1">
                        <SquareCheckBig className="size-4" />
                        <span className="text-xs">
                            {group.sections.reduce((sum, section) => sum + section.tasks.length, 0)}
                        </span>
                    </div>}
                    {showAudioFileCount && audioCount > 0 && <div className="flex items-center gap-1">
                        <FileAudio className="size-4" />
                        <span className="text-xs">
                            {audioCount}
                        </span>
                    </div>}
                </div>
                <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <ItemMenuButton iconClassName="!h-4 !w-4" />
                </div>
            </div>
        </ButtonMenuGroup>
    )
}
