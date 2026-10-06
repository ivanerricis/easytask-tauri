import { useTranslation } from "react-i18next"
import { Progress } from "@/components/ui/progress"
import { useColorAlpha } from "@/contexts/use-color-alpha"
import { getErrorMessage, hexToRgba } from "@/lib/utils"
import type { Section as SectionType, Task } from "@/types/types"
import { ChevronDown, GripVertical } from "lucide-react"
import { ButtonMenuSection } from "./ButtonMenuSection"
import { ItemMenuButton } from "@/components/item-menu"
import { useEffect, useRef, useState } from "react"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { usePreferences } from "@/contexts/use-preferences"
import type { HTMLAttributes } from "react"

type SectionHeaderProps = {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    section: SectionType
    /** Drag handle of the section (drag & drop inside the open note); omitted when the section is not draggable. */
    dragHandleRef?: (element: HTMLElement | null) => void
    dragHandleProps?: HTMLAttributes<HTMLDivElement>
}

const calculateCompletionPercentage = (tasks: Task[]): number => {
    const totalTasks = tasks.length
    if (totalTasks === 0) return 100

    const completedTasks = tasks.reduce((acc, task) => {
        const isTaskCompleted = task.completed ||
            (task.subtasks.length > 0 && task.subtasks.every(subtask => subtask.completed))
        return acc + (isTaskCompleted ? 1 : 0)
    }, 0)

    return (completedTasks / totalTasks) * 100
}

export const SectionHeader = ({ isOpen, onOpenChange, section, dragHandleRef, dragHandleProps }: SectionHeaderProps) => {
    const { t } = useTranslation()
    const [isTextAreaOpen, setTextAreaOpen] = useState(false)
    const [text, setText] = useState(section.title)
    const [error, setError] = useState<string | null>(null)
    const { renameItem } = useWorkspaceActions()
    const { patchSection } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const { showProgressBar } = usePreferences()
    const colorAlpha = useColorAlpha()
    const textareaRef = useRef<HTMLInputElement>(null)
    // Set once an edit has ended (saved or cancelled): the blur that follows Escape/Enter must not save a second time
    const done = useRef(false)

    useEffect(() => {
        if (isTextAreaOpen && textareaRef.current) {
            done.current = false
            const input = textareaRef.current
            const length = input.value.length
            input.focus()
            input.setSelectionRange(length, length)
        }
    }, [isTextAreaOpen])

    const handleChangeText = async () => {
        if (done.current) return
        done.current = true
        // Optimistic: the cached tree is updated at once and restored if the write fails
        const changed = section.title !== text && text.trim() !== ""
        const rollback = changed ? patchSection(section.id, { title: text.trim() }) : null
        try {
            if (changed) {
                await renameItem("section", section.id, text.trim())
                recorder.rename("section", section.id, section.title, text.trim())
            }
        } catch (err) {
            rollback?.()
            // The field stays open with the typed text, so it can be fixed
            setError(t("sections.renameError", { message: getErrorMessage(err) }))
            done.current = false
            return
        }
        setTextAreaOpen(false)
    }

    const handleCancel = () => {
        if (done.current) return
        done.current = true
        setError(null)
        setText(section.title)
        setTextAreaOpen(false)
    }

    const handleOpen = () => {
        onOpenChange(!isOpen)
    }

    const completionPercentage = calculateCompletionPercentage(section.tasks)

    return (
        <div className="relative flex flex-col items-center justify-center">

            <ButtonMenuSection section={section}>
                <div
                    className={`group flex items-center w-full px-1 py-1 whitespace-nowrap rounded-xs ${section.color ? "" : "bg-background border"}`}
                    style={section.color ? { backgroundColor: hexToRgba(colorAlpha.header(), section.color) } : undefined}
                >
                    {dragHandleProps &&
                        <div
                            ref={dragHandleRef}
                            {...dragHandleProps}
                            aria-label={t("sections.moveHandle")}
                            title={t("sections.moveHandleTitle")}
                            className="shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100">
                            <GripVertical className="size-4" />
                        </div>}
                    {(section.tasks.length > 0) &&
                        <button
                            type="button"
                            onClick={handleOpen}
                            aria-label={isOpen ? t("sections.collapse") : t("sections.expand")}
                            aria-expanded={isOpen}
                            className="shrink-0 cursor-pointer rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <ChevronDown className={`${isOpen ? "rotate-0" : "-rotate-90"} ml-1.5 size-5`} />
                        </button>}
                    <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        {!isTextAreaOpen && <button
                            type="button"
                            onClick={() => { setTextAreaOpen(true) }}
                            title={section.title}
                            className="text-sm ml-2 min-w-0 flex-1 truncate cursor-text text-left rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            {section.title}
                        </button>}
                        {isTextAreaOpen && <InlineErrorTooltip message={error}>
                            <input
                                ref={textareaRef}
                                type="text"
                                value={text}
                                aria-label={t("sections.titleLabel")}
                                aria-invalid={error !== null}
                                onChange={e => { setError(null); setText(e.target.value) }}
                                // After a failed save, leaving the field gives up the change instead of retrying
                                onBlur={() => { if (error) handleCancel(); else void handleChangeText() }}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleChangeText();
                                    } else if (e.key === "Escape") {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleCancel()
                                    }
                                }}
                                className={`min-w-0 flex-1 px-1 ml-2 border resize-none text-sm rounded-xs ${error ? "border-destructive" : "border-primary"}`}
                            />
                        </InlineErrorTooltip>}
                        {showProgressBar && <div className="flex items-center gap-2 shrink-0 min-w-[8rem]">
                            <Progress className="w-20" value={completionPercentage} />
                            <span className="text-xs">
                                {Math.round(completionPercentage)} %
                            </span>
                        </div>}
                        <div className="shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                            <ItemMenuButton iconClassName="!h-4 !w-4" />
                        </div>
                    </div>
                </div>
            </ButtonMenuSection>
        </div>
    )
}
