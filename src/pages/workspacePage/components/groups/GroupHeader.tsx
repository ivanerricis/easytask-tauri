import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { ChevronDown, FileAudio, LayoutList, SquareCheckBig, type LucideIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
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

/** Icon + number, named for the screen readers and for the mouse (the icon alone does not say what is counted). */
const CountBadge = ({ icon: Icon, count, label }: { icon: LucideIcon, count: number, label: string }) => (
    <TooltipCustom text={label}>
        <div role="img" aria-label={label} className="flex items-center gap-1">
            <Icon className="size-4" />
            <span className="text-xs tabular-nums">{count}</span>
        </div>
    </TooltipCustom>
)

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
    const { showSectionCount, showTaskCount, showAudioFileCount, showGroupProgressBar, showUnnamedLabels, renameOnClick = true } = usePreferences()
    const colorAlpha = useColorAlpha()
    const [isOpen, toggleOpen] = useGroupOpen(group.id)
    const progress = getGroupProgress(group)
    const { renameItem } = useWorkspaceActions()
    const { patchGroup } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const name = group.name?.trim() ?? ""
    const label = getGroupLabel(group, index)
    const taskCount = group.sections.reduce((sum, section) => sum + section.tasks.length, 0)
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
        <ButtonMenuGroup group={group} onRename={startEditing}>
            <div
                // Everything stays on one row: the name is truncated (full name in the tooltip) and the progress bar shrinks
                className={`group flex items-center gap-1 border px-1.5 py-1 w-full rounded-xs ${group.color ? "" : "bg-background hover:bg-secondary"} ${dragProps ? "touch-none cursor-grab active:cursor-grabbing" : ""}`}
                style={group.color ? { backgroundColor: hexToRgba(colorAlpha.header(), group.color) } : undefined}
                {...dragProps}>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleOpen}
                    aria-label={isOpen ? t("groups.collapse") : t("groups.expand")}
                    aria-expanded={isOpen}
                    className="size-6 shrink-0">
                    <ChevronDown className={isOpen ? "rotate-0" : "-rotate-90"} />
                </Button>
                {!isEditing && <button
                    type="button"
                    onClick={renameOnClick ? startEditing : undefined}
                    // Enter renames even when the click does not
                    onKeyDown={e => { if (!renameOnClick && e.key === "Enter") { e.preventDefault(); startEditing() } }}
                    title={name || undefined}
                    // An unnamed group shows no text unless the preference asks for the fallback label
                    aria-label={label}
                    className={`text-sm font-semibold mr-1 min-w-0 max-w-72 flex-1 h-6 truncate text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${renameOnClick ? "cursor-text" : ""} ${!name ? "text-muted-foreground" : ""}`}>
                    {name || (showUnnamedLabels ? label : "")}
                </button>}
                {isEditing && <InlineErrorTooltip message={error}>
                    <Input
                        {...inputProps}
                        onPointerDown={e => e.stopPropagation()}
                        type="text"
                        placeholder={label}
                        aria-label={t("groups.nameLabel")}
                        className="h-6 min-w-0 flex-1 mr-1 px-1 py-0 text-sm font-semibold md:text-sm border-primary"
                    />
                </InlineErrorTooltip>}
                {showGroupProgressBar && progress.total > 0 && <div className="flex items-center gap-2 shrink-0 mr-1">
                    <Progress className="w-20" value={progress.percent} aria-label={t("groups.progress")} />
                    <span className="text-xs shrink-0 tabular-nums">
                        {Math.round(progress.percent)} %
                    </span>
                </div>}
                <div className="flex shrink-0 gap-2">
                    {showSectionCount && <CountBadge icon={LayoutList} count={group.sections.length} label={t("common.counts.section", { count: group.sections.length })} />}
                    {showTaskCount && <CountBadge icon={SquareCheckBig} count={taskCount} label={t("common.counts.task", { count: taskCount })} />}
                    {showAudioFileCount && audioCount > 0 && <CountBadge icon={FileAudio} count={audioCount} label={t("groups.audioCount", { count: audioCount })} />}
                </div>
                <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <ItemMenuButton name={label} />
                </div>
            </div>
        </ButtonMenuGroup>
    )
}
