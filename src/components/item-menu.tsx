import * as React from "react"
import { EllipsisVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ItemMenuState } from "@/hooks/use-item-menu-state"
import { MenuKindProvider } from "@/components/menu-kind"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"

type ItemMenuContextValue = {
    state: ItemMenuState
    items: React.ReactNode
    contentClassName?: string
    onCloseAutoFocus?: (event: Event) => void
}

const ItemMenuContext = React.createContext<ItemMenuContextValue | null>(null)

type ItemMenuProps = {
    state: ItemMenuState
    /** Menu entries, written once with the Menu* primitives: shown by both the "…" button and the right click. */
    items: React.ReactNode
    /** Dialogs opened by the entries; rendered outside the row so they never receive the row's events. */
    dialogs?: React.ReactNode
    contentClassName?: string
    onCloseAutoFocus?: (event: Event) => void
    /** The row: a single element. A right click anywhere on it opens the menu at the pointer. */
    children: React.ReactElement
}

// Right click inside a text field or on the (portaled) menu content does not open the item menu
const ignoreContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (!event.currentTarget.contains(target) || target.closest("input, textarea, [contenteditable='true']")) {
        event.preventDefault()
    }
}

/**
 * Wraps the row of an item: right click on it opens the item menu at the cursor.
 * The "…" button inside the row is an {@link ItemMenuButton}, which opens the very same entries.
 */
export const ItemMenu = ({ state, items, dialogs, contentClassName, onCloseAutoFocus, children }: ItemMenuProps) => {
    const value = React.useMemo(
        () => ({ state, items, contentClassName, onCloseAutoFocus }),
        [state, items, contentClassName, onCloseAutoFocus],
    )

    return (
        <ItemMenuContext.Provider value={value}>
            <ContextMenu open={state.contextOpen} onOpenChange={state.setContextOpen}>
                <ContextMenuTrigger asChild onContextMenu={ignoreContextMenu}>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent
                    onClick={(e) => e.stopPropagation()}
                    className={contentClassName}
                    onCloseAutoFocus={onCloseAutoFocus}
                >
                    <MenuKindProvider value="context">{items}</MenuKindProvider>
                </ContextMenuContent>
            </ContextMenu>
            {dialogs}
        </ItemMenuContext.Provider>
    )
}

type ItemMenuButtonProps = {
    className?: string
    iconClassName?: string
    /** Renders a real <button> with this accessible name instead of the default role="button" element. */
    label?: string
}

/** The "…" button of an item (inside an {@link ItemMenu}): opens the item menu below the button. */
export const ItemMenuButton = ({ className, iconClassName = "size-4", label }: ItemMenuButtonProps) => {
    const menu = React.useContext(ItemMenuContext)
    if (!menu) return null
    const { state, items, contentClassName, onCloseAutoFocus } = menu
    const triggerClass = cn("p-1 rounded-xs cursor-pointer", className)
    const icon = <EllipsisVertical className={iconClassName} />

    return (
        <DropdownMenu open={state.dropdownOpen} onOpenChange={state.setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                {label
                    ? <button type="button" aria-label={label} onClick={(e) => e.stopPropagation()} className={triggerClass}>{icon}</button>
                    : <div role="button" onClick={(e) => e.stopPropagation()} className={triggerClass}>{icon}</div>}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                onClick={(e) => e.stopPropagation()}
                className={contentClassName}
                onCloseAutoFocus={onCloseAutoFocus}
            >
                <MenuKindProvider value="dropdown">{items}</MenuKindProvider>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
