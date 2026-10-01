import * as React from "react"
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

/**
 * The same item list is shown by the "…" button (DropdownMenu) and by the right click (ContextMenu).
 * The Menu* primitives below render the DropdownMenu or ContextMenu flavour depending on the menu they are in,
 * so an item list is written once. Outside any provider they fall back to the dropdown flavour.
 */
export type MenuKind = "dropdown" | "context"

const MenuKindContext = React.createContext<MenuKind>("dropdown")

export const MenuKindProvider = MenuKindContext.Provider

const useMenuKind = () => React.useContext(MenuKindContext)

export function MenuGroup(props: React.ComponentProps<typeof DropdownMenuGroup>) {
    return useMenuKind() === "context" ? <ContextMenuGroup {...props} /> : <DropdownMenuGroup {...props} />
}

export function MenuItem(props: React.ComponentProps<typeof DropdownMenuItem>) {
    return useMenuKind() === "context" ? <ContextMenuItem {...props} /> : <DropdownMenuItem {...props} />
}

export function MenuSeparator(props: React.ComponentProps<typeof DropdownMenuSeparator>) {
    return useMenuKind() === "context" ? <ContextMenuSeparator {...props} /> : <DropdownMenuSeparator {...props} />
}

export function MenuSub(props: React.ComponentProps<typeof DropdownMenuSub>) {
    return useMenuKind() === "context" ? <ContextMenuSub {...props} /> : <DropdownMenuSub {...props} />
}

export function MenuSubTrigger(props: React.ComponentProps<typeof DropdownMenuSubTrigger>) {
    return useMenuKind() === "context" ? <ContextMenuSubTrigger {...props} /> : <DropdownMenuSubTrigger {...props} />
}

export function MenuSubContent(props: React.ComponentProps<typeof DropdownMenuSubContent>) {
    return useMenuKind() === "context" ? <ContextMenuSubContent {...props} /> : <DropdownMenuSubContent {...props} />
}
