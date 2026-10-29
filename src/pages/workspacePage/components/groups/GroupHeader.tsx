import { MAX_NAME_LENGTH } from "@/lib/names"
import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { usePreference } from "@/contexts/use-preference"
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
import { taskSections } from "@/lib/group-sections"
import { Highlight } from "@/components/highlight"
import { useSearchHighlight } from "../note-search-context"

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
    /** Narrow group: the completion bar is hidden so the name keeps its space. */
    compact?: boolean
    /** Opens the form of a new section in the group (the "Nuova sezione" entry of its menu). */
    onAddSection?: () => void
}

export const GroupHeader = memo(({ group, index = 0, dragProps, audioCount = 0, compact = false, onAddSection }: GroupHeaderProps) => {
    const { t } = useTranslation()
    const showSectionCount = usePreference(p => p.showSectionCount)
    const showTaskCount = usePreference(p => p.showTaskCount)
    const showAudioFileCount = usePreference(p => p.showAudioFileCount)
    const showGroupProgressBar = usePreference(p => p.showGroupProgressBar)
    const showUnnamedLabels = usePreference(p => p.showUnnamedLabels)
    const renameOnClick = usePreference(p => p.renameOnClick) ?? true
    const colorAlpha = useColorAlpha()
    const search = useSearchHighlight("group", group.id)
    const [isOpen, toggleOpen] = useGroupOpen(group.id)
    const progress = useMemo(() => getGroupProgress(group), [group])
    const { renameItem } = useWorkspaceActions()
    const { patchGroup } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const name = group.name?.trim() ?? ""
    const label = getGroupLabel(group, index)
    const taskCount = useMemo(() => taskSections(group).reduce((sum, section) => sum + section.tasks.length, 0), [group])
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
        <ButtonMenuGroup group={group} onRename={startEditing} onAddSection={onAddSection}>
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
                    // Says what the button does (Enter renames), not only what it is called
                    aria-label={t("groups.renameAria", { name: label })}
                    className={`text-sm font-semibold mr-1 min-w-[6ch] max-w-72 flex-1 h-6 truncate text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${renameOnClick ? "cursor-text" : ""} ${!name ? "text-muted-foreground" : ""}`}>
                    {search.query ? <Highlight text={name} query={search.query} active={search.active} /> : name || (showUnnamedLabels ? label : "")}
                </button>}
                {isEditing && <InlineErrorTooltip message={error}>
                    <Input
                        {...inputProps}
                        onPointerDown={e => e.stopPropagation()}
                        type="text"
                        placeholder={label}
                        aria-label={t("groups.nameLabel")}
                        maxLength={MAX_NAME_LENGTH}
                        className="h-6 min-w-0 flex-1 mr-1 px-1 py-0 text-sm font-semibold md:text-sm border-primary"
                    />
                </InlineErrorTooltip>}
                {/* ml-auto: when the group is wider than the name needs, the bar, the counters and the menu stay on the right edge */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {showGroupProgressBar && !compact && progress.total > 0 && <div className="flex items-center gap-2 shrink-0 mr-1">
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
                    {/* flex + leading-none: in a block wrapper the line height leaves a gap under the button, which then sits off-center */}
                    <div className="flex items-center leading-none shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <ItemMenuButton name={label} />
                    </div>
                </div>
            </div>
        </ButtonMenuGroup>
    )
})
