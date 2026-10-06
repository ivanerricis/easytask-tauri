import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { ChevronDown, FileAudio, Grip, LayoutList, SquareCheckBig } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useGroupOpen } from "@/contexts/use-tabs"
import { getGroupProgress } from "./group-progress"
import { ButtonMenuGroup } from "./ButtonMenuGroup"
import { ItemMenuButton } from "@/components/item-menu"
import type { Group } from "@/types/types"
import { useEffect, useRef, useState, type HTMLAttributes } from "react"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { getErrorMessage, hexToRgba } from "@/lib/utils"
import { getGroupLabel } from "./group-label"

type GroupHeaderProps = {
    group: Group
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
    dragHandleRef?: (element: HTMLElement | null) => void
    dragHandleProps?: HTMLAttributes<HTMLDivElement>
    /** Number of audio files of the group (the badge is hidden when 0). */
    audioCount?: number
}

export const GroupHeader = ({ group, index = 0, dragHandleRef, dragHandleProps, audioCount = 0 }: GroupHeaderProps) => {
    const { t } = useTranslation()
    const { showSectionCount, showTaskCount, showAudioFileCount, showGroupProgressBar } = usePreferences()
    const colorAlpha = useColorAlpha()
    const [isOpen, toggleOpen] = useGroupOpen(group.id)
    const progress = getGroupProgress(group)
    const { renameItem } = useWorkspaceActions()
    const { patchGroup } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const [isEditing, setEditing] = useState(false)
    const [text, setText] = useState(group.name ?? "")
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const done = useRef(false)

    const name = group.name?.trim() ?? ""
    const label = getGroupLabel(group, index)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            const input = inputRef.current
            input.focus()
            input.setSelectionRange(input.value.length, input.value.length)
        }
    }, [isEditing])

    const startEditing = () => {
        done.current = false
        setError(null)
        setText(name)
        setEditing(true)
    }

    // Enter and blur save (an empty text removes the name), Escape cancels
    const save = async () => {
        if (done.current) return
        done.current = true
        setEditing(false)
        if (text.trim() === name) return
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const rollback = patchGroup(group.id, { name: text.trim() || null })
        try {
            await renameItem("section_group", group.id, text.trim())
            recorder.rename("section_group", group.id, group.name ?? "", text.trim())
        } catch (err) {
            rollback()
            // Back to the field with the typed text, so it can be fixed
            setError(t("groups.renameError", { message: getErrorMessage(err) }))
            done.current = false
            setEditing(true)
        }
    }

    const cancel = () => {
        done.current = true
        setError(null)
        setEditing(false)
    }

    return (
        <ButtonMenuGroup group={group}>
            <div
                // Everything stays on one row: the name is truncated (full name in the tooltip) and the progress bar shrinks
                className={`group flex items-center border px-2 py-1 w-full rounded-xs ${group.color ? "" : "bg-background hover:bg-secondary"}`}
                style={group.color ? { backgroundColor: hexToRgba(colorAlpha.header(), group.color) } : undefined}>
                {dragHandleProps && <div ref={dragHandleRef} className="group flex items-center justify-center touch-none cursor-grab active:cursor-grabbing" {...dragHandleProps}>
                    <Grip className="text-muted-foreground group-hover:text-foreground w-4 h-4 mr-2" />
                </div>}
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
                        ref={inputRef}
                        type="text"
                        value={text}
                        placeholder={label}
                        aria-label={t("groups.nameLabel")}
                        aria-invalid={error !== null}
                        onChange={e => { setError(null); setText(e.target.value) }}
                        // After a failed save, leaving the field gives up the change instead of retrying
                        onBlur={() => { if (error) cancel(); else void save() }}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                void save()
                            } else if (e.key === "Escape") {
                                e.preventDefault()
                                e.stopPropagation()
                                cancel()
                            }
                        }}
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
