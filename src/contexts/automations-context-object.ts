import { createContext } from "react"
import type { AutomationEvent } from "@/lib/automations/types"

export type AutomationsContextType = {
    /** Runs the rules of the open note for a user action on a task (never rejects). */
    dispatch: (event: AutomationEvent) => Promise<void>
}

export const AutomationsContext = createContext<AutomationsContextType | null>(null)
