import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"

type InlineEditOptions = {
    /** Current (saved) value of the field. */
    value: string
    /** Called with the trimmed text when it differs from `value`; may throw (the field then stays open with the error). */
    onCommit: (next: string) => void | Promise<void>
    /** Builds the inline message from the error thrown by `onCommit`. */
    errorMessage: (error: unknown) => string
    /** Lets an empty text be committed (e.g. a group without a name). Otherwise an empty text just closes the field. */
    allowEmpty?: boolean
}

/**
 * Inline editing of a single text field: Enter saves, Escape cancels, blur saves (or cancels after an error),
 * the error stays inline and the field is focused with the whole text selected.
 * A finished edit cannot be committed twice (e.g. Enter followed by the blur on unmount).
 * @returns The state and `inputProps` to spread on the input/textarea (the focus ref included).
 * @category Hooks
 */
export function useInlineEdit<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>({ value, onCommit, errorMessage, allowEmpty = false }: InlineEditOptions) {
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState(value)
    const [error, setError] = useState<string | null>(null)
    const ref = useRef<E>(null)
    // Set once an edit has ended (saved or cancelled): Enter + the blur that follows, or Escape + blur, must not run twice
    const done = useRef(false)

    useEffect(() => {
        const input = ref.current
        if (editing && input) {
            done.current = false
            input.focus()
            input.select()
        }
    }, [editing])

    const start = useCallback(() => {
        // Re-armed here, not only in the focus effect: a finished edit must never leave Escape/Enter disabled for the next one
        done.current = false
        setError(null)
        setText(value)
        setEditing(true)
    }, [value])

    const cancel = useCallback(() => {
        if (done.current) return
        done.current = true
        setError(null)
        setText(value)
        setEditing(false)
    }, [value])

    const save = useCallback(async () => {
        if (done.current) return
        done.current = true
        const next = text.trim()
        if (next === value.trim() || (next === "" && !allowEmpty)) {
            setEditing(false)
            return
        }
        try {
            await onCommit(next)
        } catch (err) {
            // The field stays open with the typed text, so it can be fixed
            setError(errorMessage(err))
            done.current = false
            return
        }
        setEditing(false)
    }, [text, value, allowEmpty, onCommit, errorMessage])

    const inputProps = {
        ref,
        value: text,
        "aria-invalid": error !== null,
        onChange: (e: ChangeEvent<E>) => { setError(null); setText(e.target.value) },
        // After a failed save, leaving the field gives up the change instead of retrying
        onBlur: () => { if (error) cancel(); else void save() },
        onKeyDown: (e: KeyboardEvent<E>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void save()
            } else if (e.key === "Escape") {
                e.preventDefault()
                e.stopPropagation()
                cancel()
            }
        },
    }

    return { editing, text, setText, error, start, save, cancel, inputProps }
}
