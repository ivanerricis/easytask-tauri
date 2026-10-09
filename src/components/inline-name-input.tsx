import type { ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { InlineErrorTooltip } from "@/components/inline-error-tooltip"
import { cn } from "@/lib/utils"

type InlineNameInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
    /** The error of the save; shown next to the field. */
    error: string | null
}

/**
 * The field of an inline rename inside a row (folder, note, workspace): clicks, drags and keys typed in it stay in the
 * field and never reach the row (open, select, start a drag).
 * @category Components
 */
export const InlineNameInput = ({ error, className, ...props }: InlineNameInputProps) => (
    <InlineErrorTooltip message={error}>
        <Input
            {...props}
            type="text"
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onKeyDown={e => {
                e.stopPropagation()
                props.onKeyDown?.(e)
            }}
            className={cn("pointer-events-auto h-6 min-w-0 flex-1 px-1 py-0 md:text-sm border-primary", className)}
        />
    </InlineErrorTooltip>
)
