import type { ReactNode } from "react"

type FormErrorProps = {
    /** Id to point to from the field with aria-describedby. */
    id?: string
    children?: ReactNode
}

/** Inline error of a form: announced by screen readers, renders nothing when there is no message. */
export const FormError = ({ id, children }: FormErrorProps) => {
    if (!children) return null
    return <p id={id} role="alert" className="text-sm text-destructive break-words">{children}</p>
}
