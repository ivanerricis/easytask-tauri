import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { getShortcutOverrides, saveShortcutOverrides } from "@/lib/store/shortcuts"
import { bindingEquals, formatBinding, getDefaultBindings, getShortcut, matchBinding, type Binding } from "@/lib/shortcuts"

export type ShortcutEntry = {
    handler: (e: KeyboardEvent) => void
    enabled: boolean
    allowInInputs: boolean
}

type ShortcutsContextType = {
    bindings: Record<string, Binding>
    overrides: Record<string, Binding>
    getBinding: (id: string) => Binding | undefined
    setBinding: (id: string, binding: Binding) => void
    resetBinding: (id: string) => void
    resetAll: () => void
    // While true no shortcut fires (the settings recorder is capturing keys)
    setRecording: (recording: boolean) => void
    register: (id: string, entry: { current: ShortcutEntry }) => () => void
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined)

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null
}

export const ShortcutsProvider = ({ children }: { children: React.ReactNode }) => {
    const [overrides, setOverrides] = useState<Record<string, Binding>>({})
    const registry = useRef(new Map<string, Set<{ current: ShortcutEntry }>>())
    const recordingRef = useRef(false)
    // A change made before the saved overrides finish loading wins over them
    const changedRef = useRef(false)

    useEffect(() => {
        let cancelled = false
        getShortcutOverrides().then(saved => { if (!cancelled && !changedRef.current) setOverrides(saved) }).catch(console.error)
        return () => { cancelled = true }
    }, [])

    const bindings = useMemo(() => ({ ...getDefaultBindings(), ...overrides }), [overrides])
    const bindingsRef = useRef(bindings)
    useEffect(() => { bindingsRef.current = bindings }, [bindings])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (recordingRef.current) return
            const inInput = isEditableTarget(e.target)
            let handled = false
            registry.current.forEach((entries, id) => {
                const binding = bindingsRef.current[id]
                if (!binding || !matchBinding(e, binding)) return
                entries.forEach(ref => {
                    const entry = ref.current
                    if (!entry.enabled || (inInput && !entry.allowInInputs)) return
                    handled = true
                    entry.handler(e)
                })
            })
            if (handled) e.preventDefault()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    const persist = useCallback((next: Record<string, Binding>) => {
        changedRef.current = true
        setOverrides(next)
        saveShortcutOverrides(next).catch(console.error)
    }, [])

    const setBinding = useCallback((id: string, binding: Binding) => {
        const next = { ...overrides }
        if (bindingEquals(binding, getShortcut(id).defaultBinding ?? binding)) delete next[id]
        else next[id] = binding
        persist(next)
    }, [overrides, persist])

    const resetBinding = useCallback((id: string) => {
        if (!(id in overrides)) return
        const next = { ...overrides }
        delete next[id]
        persist(next)
    }, [overrides, persist])

    const resetAll = useCallback(() => persist({}), [persist])

    const getBinding = useCallback((id: string) => bindings[id], [bindings])

    const setRecording = useCallback((recording: boolean) => { recordingRef.current = recording }, [])

    const register = useCallback((id: string, entry: { current: ShortcutEntry }) => {
        const set = registry.current.get(id) ?? new Set()
        set.add(entry)
        registry.current.set(id, set)
        return () => {
            set.delete(entry)
            if (set.size === 0 && registry.current.get(id) === set) registry.current.delete(id)
        }
    }, [])

    const value = useMemo(
        () => ({ bindings, overrides, getBinding, setBinding, resetBinding, resetAll, setRecording, register }),
        [bindings, overrides, getBinding, setBinding, resetBinding, resetAll, setRecording, register]
    )

    return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useShortcutsContext = () => {
    const context = useContext(ShortcutsContext)
    if (!context) throw new Error("useShortcutsContext must be used within a ShortcutsProvider")
    return context
}

/** Like useShortcutsContext, but null outside a provider (hints then fall back to the defaults). */
// eslint-disable-next-line react-refresh/only-export-components
export const useOptionalShortcutsContext = () => useContext(ShortcutsContext)

/** The effective binding of a shortcut (the default one outside a provider). */
// eslint-disable-next-line react-refresh/only-export-components
export const useBinding = (id: string): Binding | undefined => {
    const context = useContext(ShortcutsContext)
    return context ? context.getBinding(id) : getShortcut(id).defaultBinding
}

/** Tooltip text such as "(Ctrl + N)" for the effective binding of a shortcut. */
// eslint-disable-next-line react-refresh/only-export-components
export const useShortcutLabel = (id: string): string | undefined => {
    const binding = useBinding(id)
    return binding ? `(${formatBinding(binding).join(" + ")})` : undefined
}

/** Key labels of a shortcut for the hints, following the effective binding. */
// eslint-disable-next-line react-refresh/only-export-components
export const useShortcutKeys = (id: string): string[] => {
    const binding = useBinding(id)
    return binding ? formatBinding(binding) : getShortcut(id).keys ?? []
}
