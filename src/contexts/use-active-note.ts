import { createRequiredContextHook } from "@/lib/required-context"
import { ActiveNoteActionsContext, ActiveNoteContext } from "./active-note-context-object"

/**
 * The data of the active note.
 * @category ActiveNote Context
 */
export const useActiveNote = createRequiredContextHook(ActiveNoteContext, "useActiveNote", "ActiveNoteProvider")

/**
 * The stable actions on the active note (their identity never changes).
 * @category ActiveNote Context
 */
export const useActiveNoteActions = createRequiredContextHook(ActiveNoteActionsContext, "useActiveNoteActions", "ActiveNoteProvider")
