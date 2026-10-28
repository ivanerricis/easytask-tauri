import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { usePreferences } from "@/contexts/use-preferences"
import { cn, getErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { useAutomations } from "@/hooks/use-automations"
import { reportError } from "@/lib/report-error"
import { TASK_DENSITIES, useTaskDensity } from "./task-density"
import { useEndFieldReplaced, useTaskInsertStore } from "./task-insert-state"

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
 * - Escape closes it (discarding the text). There are no add/close buttons: Enter and Escape are the only controls.
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
    const insertStore = useTaskInsertStore()
    const listKey = `t-${parentTaskId}`
    const replaced = useEndFieldReplaced(listKey)

    const close = () => {
        insertStore.releaseEnd(listKey)
        onClose?.()
    }
    // Only one field of a new task is open at a time: a "+" line (or another bottom field) opened elsewhere closes this one
    useEffect(() => { if (replaced) onClose?.() }, [replaced, onClose])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const value = text.trim()
        if (!value) return
        await run(async () => {
            try {
                const id = await createSubTask(parentTaskId, value, newTaskPosition)
                if (keepAddingTasks) setText("")
                else close()
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
                        aria-description={t("tasks.inputHint")}
                        readOnly={saving}
                        aria-busy={saving}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); close() }
                            else if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault()
                            // Enter on the empty input ends the series, like the field of a new task (there is nothing to submit)
                            else if (e.key === "Enter" && keepAddingTasks && !text.trim() && !saving) { e.preventDefault(); close() }
                        }}
                        onBlur={() => {
                            if (!text.trim() && !saving) close()
                        }}
                        className={cn("flex-1 px-1 py-0 shadow-none", sizes.input, saving && "opacity-60")}
                    />
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
    const insertStore = useTaskInsertStore()
    const listKey = `s-${sectionId}`

    const closeField = () => {
        insertStore.releaseEnd(listKey)
        setOpen(false)
        setText("")
    }
    // Only one field of a new task is open at a time: a "+" line (or another bottom field) opened elsewhere closes this one, text discarded
    useEffect(() => insertStore.subscribe(() => {
        const slot = insertStore.getState()
        if (slot && !(slot.end && slot.listKey === listKey)) { setOpen(false); setText("") }
    }), [insertStore, listKey])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Typed text is never lost with a click elsewhere: only an empty field closes
            if (formRef.current && !formRef.current.contains(event.target as Node) && !text.trim()) closeField()
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- closeField only uses stable values
    }, [text])

    const handleOpen = () => {
        if (isOpen) { closeField(); return }
        insertStore.claimEnd(listKey)
        setOpen(true)
        setText("")
    }

    // Escape closes the row and discards the text.
    // With keepAddingTasks, Enter on an empty field closes it too (there is nothing to submit).
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && keepAddingTasks && !text.trim() && !saving && !e.nativeEvent.isComposing) {
            e.preventDefault()
            closeField()
            return
        }
        if (e.key !== "Escape") return
        e.preventDefault()
        e.stopPropagation()
        closeField()
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
                        aria-description={t("tasks.inputHint")}
                        autoFocus
                        readOnly={saving}
                        aria-busy={saving}
                        className="rounded-none border-none text-sm"
                    />
                </div>
            </form>
        )
    )
}

export const AddTask = ({ sectionId, parentTaskId, onClose, inGroup }: AddTaskProps) =>
    parentTaskId !== undefined
        ? <SubtaskInput parentTaskId={parentTaskId} sectionId={sectionId} onClose={onClose} />
        : <TopLevelAddTask sectionId={sectionId} inGroup={inGroup} />
