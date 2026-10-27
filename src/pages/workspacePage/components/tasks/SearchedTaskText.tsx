import type { KeyboardEventHandler, MouseEventHandler } from "react"
import { Highlight } from "@/components/highlight"
import { cn } from "@/lib/utils"

type SearchedTaskTextProps = {
    text: string
    query: string
    /** The occurrence that is the current match (-1 when none). */
    active: number
    label: string
    className?: string
    onClick?: MouseEventHandler<HTMLDivElement>
    onKeyDown?: KeyboardEventHandler<HTMLDivElement>
    tabIndex?: number
}

/**
 * The text of a task that holds a match of the search, in place of its read only textarea (a textarea cannot hold the
 * marks). It looks and acts as the textarea: the same classes, a click or Enter starts the rename.
 */
export const SearchedTaskText = ({ text, query, active, label, className, onClick, onKeyDown, tabIndex = 0 }: SearchedTaskTextProps) => (
    <div
        role="textbox"
        aria-readonly
        aria-multiline
        tabIndex={tabIndex}
        aria-label={label}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={cn("whitespace-pre-wrap", className)}
    >
        <Highlight text={text} query={query} active={active} />
    </div>
)
