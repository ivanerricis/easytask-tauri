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
    // Runs the enabled handlers of a shortcut as if its keys were pressed (the app menu); false when none is active
    trigger: (id: string) => boolean
    // Whether a handler of the shortcut is mounted and enabled right now
    isActive: (id: string) => boolean
}

export const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined)
