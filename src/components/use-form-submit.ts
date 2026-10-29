import { useState, type FormEvent } from "react"
import { useSubmitOnce } from "@/hooks/use-submit-once"
import { getErrorMessage } from "@/lib/utils"

/**
 * The submit of a form dialog: `submit` (for `onSubmit`) prevents the default, ignores calls while a previous one is still
 * pending, clears the previous error and runs `action`; if it throws, the message goes to `error` (for {@link NameField}
 * / FormError) and the dialog stays open. `busy` is for the UI (disabled button, read-only input). Clear the error when the
 * user edits a field with `setError(null)`.
 */
export function useFormSubmit(action: () => Promise<void>) {
    const { saving: busy, run } = useSubmitOnce()
    const [error, setError] = useState<string | null>(null)

    const submit = (e?: FormEvent) => {
        e?.preventDefault()
        return run(async () => {
            setError(null)
            try {
                await action()
            } catch (err) {
                setError(getErrorMessage(err))
            }
        })
    }

    return { busy, error, setError, submit }
}
