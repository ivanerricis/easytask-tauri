import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type FormErrorProps = {
    /** Id to point to from the field with aria-describedby. */
    id?: string
    /** Variant tweaks (merged over the defaults). */
    className?: string
    children?: ReactNode
}

/** Inline error of a form: announced by screen readers, renders nothing when there is no message. */
export const FormError = ({ id, className, children }: FormErrorProps) => {
    if (!children) return null
    return <p id={id} role="alert" className={cn("text-sm text-destructive break-words", className)}>{children}</p>
}
