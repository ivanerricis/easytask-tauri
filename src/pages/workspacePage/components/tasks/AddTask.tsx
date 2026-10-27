import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { usePreferences } from "@/contexts/use-preferences"
import { cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Plus, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { keyLabel } from "@/lib/shortcuts"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { useAutomations } from "@/hooks/use-automations"
import { reportError } from "@/lib/report-error"
import { TASK_DENSITIES, useTaskDensity } from "./task-density"
import { PlusButton } from "../section/PlusButton"
import { CloseButton } from "../section/CloseButton"

type AddTaskProps = {
    /** Section of the new task; ignored for subtasks, which inherit the section of their parent. */
    sectionId: number | null
    /** When set, the input creates a subtask of this task and starts open (no "+" placeholder). */
    parentTaskId?: number
    /** Called when the input is dismissed (only meaningful with parentTaskId). */
    onClose?: () => void
    /** The task goes directly in a group: the closed state is a dashed "New task" button instead of the "+" of a section. */
    inGroup?: boolean
}

/**
 * Inline "new subtask" row, laid out like a subtask row of Task.tsx (same padding, indent and font size). It follows the same
 * rule as the field of a new task:
 * - Enter adds the subtask. With keepAddingTasks the input stays open and focused for the next one, and Enter on the empty
 *   input closes it; without it the input closes after adding.
 * - Escape or the X button closes it (discarding the text).
 * - Blur / click outside closes it only when empty: typed text is never lost silently.
 * While saving the input is read-only (not disabled, so it keeps focus) and further submits are ignored.
 */
const SubtaskInput = ({ parentTaskId, sectionId, onClose }: { parentTaskId: number, sectionId: number | null, onClose?: () => void }) => {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const { saving, run } = useSubmitOnce()
    const { createSubTask } = useWorkspaceActions()
    const { appendTask, applyTaskMove } = useActiveNoteActions()
    const { newTaskPosition, keepAddingTasks } = usePreferences()
    const sizes = TASK_DENSITIES[useTaskDensity()]
    const recorder = useUndoRecorder()
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const value = text.trim()
        if (!value) return
        await run(async () => {
            try {
                const id = await createSubTask(parentTaskId, value, newTaskPosition)
                if (keepAddingTasks) setText("")
                else onClose?.()
                appendTask(id, { parentTaskId }, value)
                // The cache appends it: at the top it moves before its siblings, as the database ordered it
                if (newTaskPosition === "top" && sectionId !== null) applyTaskMove(id, { sectionId, parentTaskId }, 0)
                recorder.create("task", id, value)
            } catch (error: unknown) {
                reportError(error, getErrorMessage(error) || t("tasks.errors.createSubtask"))
            } finally {
                if (keepAddingTasks) inputRef.current?.focus()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="w-full border-b">
            <div className={cn("flex items-start w-full px-1", sizes.padding)}>
                <div className="flex items-start gap-2 ml-4 w-full">
                    {/* Inert placeholder in the exact spot (and look) of a real subtask checkbox */}
                    <span aria-hidden className={cn("size-4 shrink-0 rounded-xs border border-input opacity-50", sizes.checkbox)} />
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
                            // Enter on the empty input ends the series, like the field of a new task (the disabled submit button blocks the form there)
                            else if (e.key === "Enter" && keepAddingTasks && !text.trim() && !saving) { e.preventDefault(); onClose?.() }
                        }}
                        onBlur={() => {
                            if (!text.trim() && !saving) onClose?.()
                        }}
                        className={cn("flex-1 px-1 py-0 shadow-none", sizes.input, saving && "opacity-60")}
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

/** The focus is on nothing, or still on the form: nothing else claimed it. */
const focusIsFree = (form: HTMLElement | null) => {
    const active = document.activeElement
    return !active || active === document.body || !!form?.contains(active)
}

const TopLevelAddTask = ({ sectionId, inGroup }: { sectionId: number | null, inGroup?: boolean }) => {
    const { t } = useTranslation()
    const [isOpen, setOpen] = useState(false)
    const [text, setText] = useState("")
    const { createTask } = useWorkspaceActions()
    const { appendTask, applyTaskMove } = useActiveNoteActions()
    const { newTaskPosition, keepAddingTasks } = usePreferences()
    const recorder = useUndoRecorder()
    const { dispatch } = useAutomations()
    const formRef = useRef<HTMLFormElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const { saving, run } = useSubmitOnce()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Typed text is never lost with a click elsewhere: only an empty field closes
            if (formRef.current && !formRef.current.contains(event.target as Node) && !text.trim()) {
                setOpen(false)
                setText("")
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [text])

    const handleOpen = () => {
        setOpen(prev => !prev)
        setText("")
    }

    // Escape closes the row and discards the text, like the X button.
    // With keepAddingTasks, Enter on an empty field closes it too (the disabled submit button blocks the form submit there).
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && keepAddingTasks && !text.trim() && !saving && !e.nativeEvent.isComposing) {
            e.preventDefault()
            setOpen(false)
            setText("")
            return
        }
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
                    const id = await createTask(sectionId, value, newTaskPosition)
                    if (keepAddingTasks) setText("")
                    else handleOpen()
                    appendTask(id, { sectionId }, value)
                    // The cache appends it: at the top it moves before its siblings, as the database ordered it
                    if (newTaskPosition === "top") applyTaskMove(id, { sectionId, parentTaskId: null }, 0)
                    recorder.create("task", id, value)
                    void dispatch({ type: "task.created", taskId: id })
                } catch (error: unknown) {
                    reportError(error, getErrorMessage(error) || t("tasks.errors.createTask"))
                } finally {
                    // The task is created a moment later: if the focus went elsewhere meanwhile (a menu just opened) it is not taken back
                    if (keepAddingTasks && focusIsFree(formRef.current)) inputRef.current?.focus()
                }
            })
        }
    }

    return (
        !isOpen ? (
            inGroup ? (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleOpen}
                    aria-label={t("groups.addTask")}
                    title={t("groups.addTask")}
                    className="w-full h-9 rounded-xs border border-dashed border-muted-foreground/45 hover:border-foreground/60 font-normal text-muted-foreground hover:text-foreground"
                >
                    <Plus />
                    <span className="text-nowrap">{t("groups.addTask")}</span>
                </Button>
            ) : (
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
            )
        ) : (
            <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex flex-col items-center justify-center w-full"
            >
                <div className="flex items-center justify-center w-full bg-background">
                    <Input
                        ref={inputRef}
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

export const AddTask = ({ sectionId, parentTaskId, onClose, inGroup }: AddTaskProps) =>
    parentTaskId !== undefined
        ? <SubtaskInput parentTaskId={parentTaskId} sectionId={sectionId} onClose={onClose} />
        : <TopLevelAddTask sectionId={sectionId} inGroup={inGroup} />
