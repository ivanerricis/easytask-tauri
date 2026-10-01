import { createContext } from "react"
import type { Binding } from "@/lib/shortcuts"

export type ShortcutEntry = {
    handler: (e: KeyboardEvent) => void
    enabled: boolean
    allowInInputs: boolean
}

export type ShortcutsContextType = {
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

export const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined)
