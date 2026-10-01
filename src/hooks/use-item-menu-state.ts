import { useCallback, useState } from "react"

/** Open state of the two menus of an item: the "…" button (dropdown) and the right click (context menu). */
export function useItemMenuState() {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [contextOpen, setContextOpen] = useState(false)
    const close = useCallback(() => {
        setDropdownOpen(false)
        setContextOpen(false)
    }, [])
    return { dropdownOpen, setDropdownOpen, contextOpen, setContextOpen, close }
}

export type ItemMenuState = ReturnType<typeof useItemMenuState>
