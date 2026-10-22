import { createContext } from "react"
import type { AutomationEvent } from "@/lib/automations/types"

export type AutomationsContextType = {
    /** Runs the rules of the open note for a user action on a task (never rejects). */
    dispatch: (event: AutomationEvent) => Promise<void>
    /**
     * Re-aligns the colors with the state rules of the open note, silently (never rejects). Also drops the cached rules of the note:
     * whoever changes the automations of the open note must call it afterwards (the automations dialog does).
     */
    sync: () => Promise<void>
}

export const AutomationsContext = createContext<AutomationsContextType | null>(null)
