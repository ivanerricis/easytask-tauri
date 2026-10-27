import { useContext } from "react"
import { AutomationsContext, type AutomationsContextType } from "@/contexts/automations-context-object"
import { useIsActiveDraft } from "@/contexts/use-template-drafts"

const NOOP: AutomationsContextType = { dispatch: async () => {}, sync: async () => {} }

/**
 * Runs the automations of the open note after a user action on a task. Outside an AutomationsProvider it does
 * nothing, so the components that dispatch also work in isolation. It also does nothing while the open note is a
 * template draft (a template has no automations).
 * @category Automations
 */
export const useAutomations = (): AutomationsContextType => {
    const context = useContext(AutomationsContext) ?? NOOP
    return useIsActiveDraft() ? NOOP : context
}
