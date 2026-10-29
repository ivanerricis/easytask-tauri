import { useRef, useState } from "react"
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react"
import { useTranslation } from "react-i18next"
import { usePreference } from "@/contexts/use-preference"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { reportError } from "@/lib/report-error"
import { getErrorMessage } from "@/lib/utils"

type NewTaskContext = {
    /** Empties the field (to type the next task). */
    clear: () => void
    /** What a plain "add" does afterwards: empties the field with keepAddingTasks, closes it otherwise. */
    next: () => void
}

type UseNewTaskFieldOptions = {
    /** Writes the new task (and updates the cache / the undo history); `value` is the trimmed text. Errors are reported. */
    create: (value: string, context: NewTaskContext) => Promise<void>
    /** Dismisses the field (Escape, Enter on the empty field, blur). */
    onClose: () => void
    /** Message of the error toast when the write fails and the error has no message of its own. */
    errorFallback: string
    /** Escape does not reach the listeners above the field. */
    stopEscape?: boolean
    /** Blur closes the field when it is empty (and not saving). Default true. */
    closeOnBlur?: boolean
    /** Submit does nothing while false (e.g. there is no section to put the task in). Default true. */
    canSubmit?: boolean
    /** With keepAddingTasks, whether the field takes the focus back after a submit. Default always. */
    shouldRefocus?: () => boolean
}

/**
 * The behaviour shared by the fields of a new task (subtask, task at the end of a list, task inserted by a "+" line):
 * - Escape closes it; Enter while composing is ignored; with keepAddingTasks, Enter on the empty field closes it;
 * - blur closes it only when empty and not saving (typed text is never lost silently);
 * - submit: one at a time (the input is read-only while saving), calls `create`, reports errors, and with keepAddingTasks
 *   refocuses the field for the next task.
 * The layout and the write stay in the caller.
 * @returns `inputProps` to spread on the {@link Input} (the caller adds placeholder, aria-label, autoFocus, className),
 *   `onSubmit` for the form, `text` / `setText`, `saving`, `keepAddingTasks`.
 * @category Hooks
 */
export function useNewTaskField({ create, onClose, errorFallback, stopEscape, closeOnBlur = true, canSubmit = true, shouldRefocus }: UseNewTaskFieldOptions) {
    const { t } = useTranslation()
    const [text, setText] = useState("")
    const { saving, run } = useSubmitOnce()
    const keepAddingTasks = usePreference(p => p.keepAddingTasks)
    const inputRef = useRef<HTMLInputElement>(null)

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault()
            if (stopEscape) e.stopPropagation()
            onClose()
        } else if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault()
        // Enter on the empty field ends the series (there is nothing to submit)
        else if (e.key === "Enter" && keepAddingTasks && !text.trim() && !saving) { e.preventDefault(); onClose() }
    }

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const value = text.trim()
        if (!value || !canSubmit) return
        await run(async () => {
            try {
                await create(value, {
                    clear: () => setText(""),
                    next: () => { if (keepAddingTasks) setText(""); else onClose() },
                })
            } catch (error: unknown) {
                reportError(error, getErrorMessage(error) || errorFallback)
            } finally {
                if (keepAddingTasks && (shouldRefocus?.() ?? true)) inputRef.current?.focus()
            }
        })
    }

    const inputProps = {
        ref: inputRef as RefObject<HTMLInputElement>,
        value: text,
        onChange: (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value),
        onKeyDown,
        onBlur: closeOnBlur ? () => { if (!text.trim() && !saving) onClose() } : undefined,
        autoComplete: "off",
        "aria-description": t("tasks.inputHint"),
        readOnly: saving,
        "aria-busy": saving,
    }

    return { inputProps, onSubmit, text, setText, saving, keepAddingTasks, inputRef }
}
