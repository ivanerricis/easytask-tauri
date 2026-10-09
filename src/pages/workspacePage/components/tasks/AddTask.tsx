import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { keyLabel } from "@/lib/shortcuts"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { useAutomations } from "@/hooks/use-automations"
import { reportError } from "@/lib/report-error"
import { PlusButton } from "../section/PlusButton"
import { CloseButton } from "../section/CloseButton"

type AddTaskProps = {
    /** Section of the new task; ignored for subtasks, which inherit the section of their parent. */
    sectionId: number | null
    /** When set, the input creates a subtask of this task and starts open (no "+" placeholder). */
    parentTaskId?: number
    /** Called when the input is dismissed (only meaningful with parentTaskId). */
    onClose?: () => void
}

/**
 * Inline "new subtask" row, laid out like a subtask row of Task.tsx (same padding, indent and font size).
 * - Enter adds and keeps the input open and focused for the next one.
 * - Escape or the X button closes it (discarding the text).
 * - Blur / click outside closes it only when empty: typed text is never lost silently.
 * While saving the input is read-only (not disabled, so it keeps focus) and further submits are ignored.
 */
const SubtaskInput = ({ parentTaskId, onClose }: { parentTaskId: number, onClose?: () => void }) => {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const { saving, run } = useSubmitOnce()
    const { createSubTask } = useWorkspaceActions()
    const { appendTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const value = text.trim()
        if (!value) return
        await run(async () => {
            try {
                const id = await createSubTask(parentTaskId, value)
                setText("")
                appendTask(id, { parentTaskId }, value)
                recorder.create("task", id, value)
            } catch (error: unknown) {
                reportError(error, getErrorMessage(error) || t("tasks.errors.createSubtask"))
            } finally {
                inputRef.current?.focus()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="w-full border-b">
            <div className="flex items-start w-full px-1 py-1.5">
                <div className="flex items-start gap-2 ml-4 w-full">
                    {/* Inert placeholder in the exact spot (and look) of a real subtask checkbox */}
                    <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded-xs border border-input opacity-50" />
                    <Input
                        ref={inputRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t("tasks.newSubtaskPlaceholder")}
                        aria-label={t("tasks.newSubtask")}
                        autoFocus
                        autoComplete="off"
                        readOnly={saving}
                        aria-busy={saving}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); onClose?.() }
                            else if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault()
                        }}
                        onBlur={() => {
                            if (!text.trim() && !saving) onClose?.()
                        }}
                        className={cn("flex-1 h-6 px-1 py-0 text-sm md:text-sm shadow-none", saving && "opacity-60")}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                        <TooltipCustom text={t("common.add")} shortcut={keyLabel("enter")}>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                aria-label={t("tasks.addSubtask")}
                                disabled={!text.trim() || saving}
                                className="size-6 text-muted-foreground hover:text-foreground"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Check />}
                            </Button>
                        </TooltipCustom>
                        <TooltipCustom text={t("common.close")} shortcut={keyLabel("escape")}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={t("common.close")}
                                onClick={() => onClose?.()}
                                className="size-6 text-muted-foreground hover:text-foreground"
                            >
                                <X />
                            </Button>
                        </TooltipCustom>
                    </div>
                </div>
            </div>
        </form>
    )
}

const TopLevelAddTask = ({ sectionId }: { sectionId: number | null }) => {
    const { t } = useTranslation()
    const [isOpen, setOpen] = useState(false)
    const [text, setText] = useState("")
    const { createTask } = useWorkspaceActions()
    const { appendTask } = useActiveNoteActions()
    const recorder = useUndoRecorder()
    const { dispatch } = useAutomations()
    const formRef = useRef<HTMLFormElement>(null)
    const { saving, run } = useSubmitOnce()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(event.target as Node)) {
                setOpen(false)
                setText("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setText("")
    }

    // Escape closes the row and discards the text, like the X button
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Escape") return
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
        setText("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (text.trim() && sectionId !== null) {
            await run(async () => {
                try {
                    const value = text.trim()
                    const id = await createTask(sectionId, value)
                    handleOpen()
                    appendTask(id, { sectionId }, value)
                    recorder.create("task", id, value)
                    void dispatch({ type: "task.created", taskId: id })
                } catch (error: unknown) {
                    reportError(error, getErrorMessage(error) || t("tasks.errors.createTask"))
                }
            })
        }
    }

    return (
        !isOpen ? (
            <Button
                type="button"
                variant="ghost"
                onClick={handleOpen}
                aria-label={t("tasks.add")}
                title={t("tasks.add")}
                className="w-full h-9 rounded-none font-normal text-muted-foreground hover:text-foreground"
            >
                <Plus />
            </Button>
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center w-full"
            >
                <div className="flex items-center justify-center w-full bg-background">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("tasks.placeholder")}
                        aria-label={t("tasks.add")}
                        autoFocus
                        readOnly={saving}
                        className="rounded-none border-none text-sm"
                    />
                </div>
                <div className="flex items-center w-full border-t divide-x">
                    <PlusButton disabled={!text.trim() || saving} />
                    <CloseButton onClick={handleOpen} />
                </div>
            </form>
        )
    )
}

export const AddTask = ({ sectionId, parentTaskId, onClose }: AddTaskProps) =>
    parentTaskId !== undefined
        ? <SubtaskInput parentTaskId={parentTaskId} onClose={onClose} />
        : <TopLevelAddTask sectionId={sectionId} />
