import type { ReactNode } from "react"
import { KbdKeys } from "@/components/kbd"
import { useShortcutKeys } from "@/contexts/use-shortcuts"
import { cn } from "@/lib/utils"

export type EmptyStateHint = {
    label: string
    /** Id of a shortcut: its keys follow the user's custom bindings. */
    shortcutId?: string
    /** Fixed keys for the actions that are not configurable shortcuts (e.g. Enter). */
    keys?: string[]
}

const Hint = ({ label, shortcutId, keys }: EmptyStateHint) => {
    // The hook needs a shortcut id: a hint with fixed keys has none, so its keys are rendered by the other component
    return shortcutId
        ? <ShortcutHint label={label} shortcutId={shortcutId} />
        : <HintRow label={label} keys={keys} />
}

const ShortcutHint = ({ label, shortcutId }: { label: string, shortcutId: string }) => {
    const keys = useShortcutKeys(shortcutId)
    return <HintRow label={label} keys={keys} />
}

const HintRow = ({ label, keys }: { label: string, keys?: string[] }) => (
    <li className="flex items-center justify-center gap-2 text-sm">
        <span>{label}</span>
        {keys && keys.length > 0 && <KbdKeys keys={keys} />}
    </li>
)

type EmptyStateProps = {
    title: string
    description?: string
    hints?: EmptyStateHint[]
    /** A button (or any control) suggesting the next action. */
    action?: ReactNode
    /** Smaller text and spacing, for narrow containers such as the sidebar or a folder. */
    compact?: boolean
    className?: string
}

/**
 * Suggestion shown in place of an empty list: a short title, a description and the shortcuts of the suggested actions.
 * @category Empty states
 */
export const EmptyState = ({ title, description, hints, action, compact = false, className }: EmptyStateProps) => (
    <div
        data-testid="empty-state"
        className={cn("flex w-full flex-col items-center text-center text-muted-foreground", compact ? "gap-1 p-2" : "gap-2 p-4", className)}
    >
        <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>{title}</p>
        {description && <p className="text-sm">{description}</p>}
        {hints && hints.length > 0 && (
            <ul className="flex flex-col gap-1">
                {hints.map(hint => <Hint key={hint.label} {...hint} />)}
            </ul>
        )}
        {action}
    </div>
)
