import { useId, type ComponentProps, type ReactNode } from "react"
import { FormError } from "@/components/form-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_NAME_LENGTH } from "@/lib/names"

type NameFieldProps = Omit<ComponentProps<typeof Input>, "id" | "value" | "onChange" | "aria-invalid" | "aria-describedby"> & {
    /** Id of the input (the label points to it); generated when omitted. */
    id?: string
    label: ReactNode
    /** The label is only for screen readers. */
    hideLabel?: boolean
    value: string
    onChange: (value: string) => void
    /** The error of the form: marks the field invalid and is shown under it (see `showError`). */
    error?: string | null
    /** Id of the error message (the input points to it); generated when omitted. */
    errorId?: string
    /** Show the error right under the field (default); false when the form renders it elsewhere with `errorId`. */
    showError?: boolean
    /** Select the whole text when the field gets the focus: typing replaces a prefilled name. */
    selectOnFocus?: boolean
    /** Next to the input (e.g. a color picker). When given, even as `false`, the input is wrapped in a row, so it keeps its place in the DOM if the extra appears or goes. */
    children?: ReactNode
}

/**
 * The "Name" field of the dialogs that create or rename something: label, input limited to MAX_NAME_LENGTH, and the error
 * (announced, linked with aria-invalid / aria-describedby). Renders a fragment: the parent decides the spacing (e.g. `grid gap-3`).
 */
export const NameField = ({
    id, label, hideLabel, value, onChange, error, errorId, showError = true, selectOnFocus, onFocus, children, ...props
}: NameFieldProps) => {
    const generatedId = useId()
    const generatedErrorId = useId()
    const inputId = id ?? generatedId
    const messageId = errorId ?? generatedErrorId
    const input = (
        <Input
            name="name"
            maxLength={MAX_NAME_LENGTH}
            {...props}
            id={inputId}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            onFocus={e => {
                if (selectOnFocus) e.target.select()
                onFocus?.(e)
            }}
            onChange={e => onChange(e.target.value)}
        />
    )
    return (
        <>
            <Label htmlFor={inputId} className={hideLabel ? "sr-only" : undefined}>{label}</Label>
            {children !== undefined ? <div className="flex gap-2">{input}{children}</div> : input}
            {showError && <FormError id={messageId}>{error}</FormError>}
        </>
    )
}
