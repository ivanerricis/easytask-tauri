import { useContext } from "react"
import { formatBinding, getShortcut, keyLabel, type Binding } from "@/lib/shortcuts"
import { ShortcutsContext } from "./shortcuts-context-object"

export const useShortcutsContext = () => {
    const context = useContext(ShortcutsContext)
    if (!context) throw new Error("useShortcutsContext must be used within a ShortcutsProvider")
    return context
}

/** Like useShortcutsContext, but null outside a provider (hints then fall back to the defaults). */
export const useOptionalShortcutsContext = () => useContext(ShortcutsContext)

/** The effective binding of a shortcut (the default one outside a provider). */
export const useBinding = (id: string): Binding | undefined => {
    const context = useContext(ShortcutsContext)
    return context ? context.getBinding(id) : getShortcut(id).defaultBinding
}

/** Tooltip text such as "(Ctrl + N)" for the effective binding of a shortcut. */
export const useShortcutLabel = (id: string): string | undefined => {
    const binding = useBinding(id)
    return binding ? `(${formatBinding(binding).join(" + ")})` : undefined
}

/** Key labels of a shortcut for the hints, following the effective binding. */
export const useShortcutKeys = (id: string): string[] => {
    const binding = useBinding(id)
    return binding ? formatBinding(binding) : (getShortcut(id).keys ?? []).map(key => keyLabel(key))
}
