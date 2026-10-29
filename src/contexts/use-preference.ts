import { useContext, useSyncExternalStore } from "react"
import { PreferencesContext, PreferencesStoreContext, type PreferencesContextType } from "./preferences-context-object"
import { usePreferences } from "./use-preferences"

const NO_SUBSCRIPTION = () => () => { }
const NO_PREFERENCES = {} as PreferencesContextType

/**
 * Without the store (a context given by hand, tests that replace usePreferences, or no provider at all): the whole-context
 * hook and the raw context, or nothing.
 */
const useLegacyPreferences = (): PreferencesContextType => {
    const context = useContext(PreferencesContext)
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return { ...context, ...usePreferences() }
    } catch {
        return context ?? NO_PREFERENCES
    }
}

/**
 * Reads a part of the preferences: the component re-renders only when the selected value changes (not on every other
 * preference, nor while the audio player is dragged, as `usePreferences()` does). The selector must return a primitive
 * or a value that keeps its identity (a setter, a ref). Outside of a provider the selector gets an empty object, so the
 * caller falls back to its default.
 */
export function usePreference<S>(selector: (preferences: PreferencesContextType) => S): S {
    const store = useContext(PreferencesStoreContext)
    // The store is there for the whole life of a mounted tree: the branch never changes between renders
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const legacy = store ? NO_PREFERENCES : useLegacyPreferences()
    return useSyncExternalStore(
        store ? store.subscribe : NO_SUBSCRIPTION,
        () => selector(store ? store.getState() : legacy),
    )
}
