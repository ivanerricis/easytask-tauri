import { createContext } from "react"
import type { AutomationEvent } from "@/lib/automations/types"

export type AutomationsContextType = {
    /**
     * Runs the rules of a note for a user action on a task (never rejects). `noteId` is the note the action was done in
     * (a pane without the focus has its own); without it the active note of the focused pane.
     */
    dispatch: (event: AutomationEvent, noteId?: number | null) => Promise<void>
    /**
     * Re-aligns the colors with the state rules of the open note, silently (never rejects). Also drops the cached rules of the note:
     * whoever changes the automations of the open note must call it afterwards (the automations dialog does).
     */
    sync: (noteId?: number | null) => Promise<void>
}

export const AutomationsContext = createContext<AutomationsContextType | null>(null)
