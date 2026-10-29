import { useContext, useMemo } from "react"
import { AutomationsContext, type AutomationsContextType } from "@/contexts/automations-context-object"
import { useActiveNoteId } from "@/contexts/use-tabs"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"

const NOOP: AutomationsContextType = { dispatch: async () => {}, sync: async () => {} }

/**
 * Runs the automations of the open note after a user action on a task. Outside an AutomationsProvider it does
 * nothing, so the components that dispatch also work in isolation. It also does nothing while the open note is a
 * template draft (a template has no automations). Inside a pane the rules run against the note of that pane (which
 * may not be the focused one); outside the panes against the focused pane's note.
 * @category Automations
 */
export const useAutomations = (): AutomationsContextType => {
    const context = useContext(AutomationsContext) ?? NOOP
    const noteId = useActiveNoteId()
    const isDraft = useIsActiveDraft()
    return useMemo<AutomationsContextType>(() => isDraft ? NOOP : {
        dispatch: (event, target) => context.dispatch(event, target ?? noteId),
        sync: target => context.sync(target ?? noteId),
    }, [context, noteId, isDraft])
}
