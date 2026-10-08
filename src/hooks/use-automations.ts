import { useContext } from "react"
import { AutomationsContext, type AutomationsContextType } from "@/contexts/automations-context-object"

const NOOP: AutomationsContextType = { dispatch: async () => {} }

/**
 * Runs the automations of the open note after a user action on a task. Outside an AutomationsProvider it does
 * nothing, so the components that dispatch also work in isolation.
 * @category Automations
 */
export const useAutomations = (): AutomationsContextType => useContext(AutomationsContext) ?? NOOP
