import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipCustom } from "@/components/tooltip-custom"
import { useWorkspaceActions } from "@/contexts/workspace-data"
import { useActiveNoteActions } from "@/contexts/use-active-note"
import { useUndoRecorder } from "@/contexts/undo/use-undo"
import { usePreferences } from "@/contexts/use-preferences"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { useAutomations } from "@/hooks/use-automations"
import { reportError } from "@/lib/report-error"
import { keyLabel } from "@/lib/shortcuts"
import { cn, getErrorMessage } from "@/lib/utils"
import { TASK_DENSITIES, useTaskDensity } from "./task-density"
import { useInsertSlot, useTaskInsertStore } from "./task-insert-state"

type InsertTaskInputProps = {
    listKey: string
    /** The task the new one goes after (null = at the top of the list). */
    afterTaskId: number | null
    parent: { sectionId: number } | { parentTaskId: number }
    /** Nesting level: subtasks are indented like their rows. */
    depth?: number
}

function InsertTaskForm({ listKey, afterTaskId, parent, depth = 0 }: InsertTaskInputProps) {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const { saving, run } = useSubmitOnce()
    const { insertTaskAfter } = useWorkspaceActions()
    const { appendTask } = useActiveNoteActions()
    const { keepAddingTasks } = usePreferences()
    const sizes = TASK_DENSITIES[useTaskDensity()]
    const recorder = useUndoRecorder()
    const { dispatch } = useAutomations()
    const store = useTaskInsertStore()
    const inputRef = useRef<HTMLInputElement>(null)

    // The field is mounted again after the task it follows changes: the new one takes the focus
    useEffect(() => { inputRef.current?.focus() }, [])

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        const value = text.trim()
        if (!value) return
        await run(async () => {
            try {
                const { id, index } = await insertTaskAfter(parent, afterTaskId, value)
                appendTask(id, parent, value, index)
                recorder.create("task", id, value)
                if ("sectionId" in parent) void dispatch({ type: "task.created", taskId: id })
                const current = store.getState()
                // Moves on only if this field is still the open one (it may have been closed or replaced meanwhile)
                if (keepAddingTasks && current?.listKey === listKey && current.afterTaskId === afterTaskId) {
                    store.moveAfter(id)
                    setText("")
                } else if (current?.listKey === listKey && current.afterTaskId === afterTaskId) store.close()
            } catch (error: unknown) {
                reportError(error, getErrorMessage(error) || t("tasks.errors.createTask"))
            } finally {
                if (keepAddingTasks) inputRef.current?.focus()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="w-full border-b">
            <div className={cn("flex items-start w-full px-1", sizes.padding)}>
                <div className={cn("flex items-start gap-2 w-full", depth > 0 && "ml-4")}>
                    {/* Inert placeholder in the exact spot (and look) of a real checkbox */}
                    <span aria-hidden className={cn("size-4 shrink-0 rounded-xs border border-input opacity-50", depth > 0 ? sizes.subtaskCheckbox : sizes.checkbox)} />
                    <Input
                        ref={inputRef}
                        value={text}
                        onChange={event => setText(event.target.value)}
                        placeholder={t("tasks.insertLine.placeholder")}
                        aria-label={t("tasks.insertLine.label")}
                        autoComplete="off"
                        readOnly={saving}
                        aria-busy={saving}
                        onKeyDown={event => {
                            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); store.close() }
                            else if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault()
                            // Enter on the empty field ends the series (the disabled submit button blocks the form there)
                            else if (event.key === "Enter" && keepAddingTasks && !text.trim() && !saving) { event.preventDefault(); store.close() }
                        }}
                        onBlur={() => {
                            if (!text.trim() && !saving) store.close()
                        }}
                        className={cn("flex-1 px-1 py-0 shadow-none", sizes.input, saving && "opacity-60")}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                        <TooltipCustom text={t("common.add")} shortcut={keyLabel("enter")}>
                            <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                aria-label={t("tasks.add")}
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
                                onClick={() => store.close()}
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

/**
 * The field of a new task opened by a "+" line, laid out like a task row. Enter inserts the task right there (one undo step);
 * with keepAddingTasks the field moves under the new task and stays focused, otherwise it closes. Esc or X close it
 * discarding the text; blur closes it only when empty. It is shown only while the open slot is this one: opening another
 * field elsewhere removes it.
 */
export function InsertTaskInput(props: InsertTaskInputProps) {
    const slot = useInsertSlot(props.listKey)
    if (!slot || slot.afterTaskId !== props.afterTaskId) return null
    return <InsertTaskForm {...props} />
}
