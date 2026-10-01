import { useTranslation } from "react-i18next"
import { usePreferences } from "@/contexts/use-preferences"
import { ChevronDown, Grip, LayoutList, SquareCheckBig } from "lucide-react"
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
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/utils"
import { getGroupLabel } from "./group-label"

type GroupHeaderProps = {
    group: Group
    /** Position of the group in the note (0-based), used for the default label "Gruppo N". */
    index?: number
    dragHandleRef?: (element: HTMLElement | null) => void
    dragHandleProps?: HTMLAttributes<HTMLDivElement>
}

export const GroupHeader = ({ group, index = 0, dragHandleRef, dragHandleProps }: GroupHeaderProps) => {
    const { t } = useTranslation()
    const { showSectionCount, showTaskCount, showGroupProgressBar } = usePreferences()
    const [isOpen, toggleOpen] = useGroupOpen(group.id)
    const progress = getGroupProgress(group)
    const { renameItem } = useWorkspaceActions()
    const { patchGroup } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const [isEditing, setEditing] = useState(false)
    const [text, setText] = useState(group.name ?? "")
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
            toast.error(t("groups.renameError", { message: getErrorMessage(err) }))
        }
    }

    return (
        <ButtonMenuGroup group={group}>
            <div className="group flex items-center justify-between border px-2 py-1 bg-background hover:bg-secondary w-full rounded-xs">
                {dragHandleProps && <div ref={dragHandleRef} className="group flex items-center justify-center touch-none cursor-grab active:cursor-grabbing" {...dragHandleProps}>
                    <Grip className="text-muted-foreground group-hover:text-foreground w-4 h-4 mr-3" />
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
                    className={`text-sm font-semibold mr-3 min-w-0 flex-1 break-words cursor-text text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${name ? "" : "text-muted-foreground"}`}>
                    {label}
                </button>}
                {isEditing && <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    placeholder={label}
                    aria-label={t("groups.nameLabel")}
                    onChange={e => setText(e.target.value)}
                    onBlur={() => { void save() }}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            void save()
                        } else if (e.key === "Escape") {
                            e.preventDefault()
                            done.current = true
                            setEditing(false)
                        }
                    }}
                    className="min-w-0 flex-1 mr-3 px-1 border border-primary text-sm font-semibold rounded-xs"
                />}
                {showGroupProgressBar && progress.total > 0 && <div className="flex items-center gap-2 shrink-0 mr-3">
                    <Progress className="w-16" value={progress.percent} />
                    <span className="text-xs">
                        {Math.round(progress.percent)} %
                    </span>
                </div>}
                <div className="flex shrink-0 gap-3">
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
                </div>
                <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <ItemMenuButton iconClassName="!h-4 !w-4" />
                </div>
            </div>
        </ButtonMenuGroup>
    )
}
