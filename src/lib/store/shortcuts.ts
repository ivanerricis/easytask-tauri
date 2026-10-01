import type { Binding } from "@/lib/shortcuts"
import { store } from "./initStore"

const SHORTCUT_OVERRIDES_KEY = "shortcutOverrides"

/**
 * Gets the user-customized shortcut bindings.
 * @returns A promise that resolves to a map from shortcut id to binding (empty when nothing is customized).
 * @category Store
 */
export const getShortcutOverrides = async (): Promise<Record<string, Binding>> => {
    const value = await store.get<Record<string, Binding>>(SHORTCUT_OVERRIDES_KEY)
    return value && typeof value === "object" ? value : {}
}

/**
 * Saves the user-customized shortcut bindings.
 * @param overrides A map from shortcut id to binding; only customized shortcuts should be included.
 * @returns A promise that resolves when the value is saved.
 * @category Store
 */
export const saveShortcutOverrides = async (overrides: Record<string, Binding>): Promise<void> => {
    await store.set(SHORTCUT_OVERRIDES_KEY, overrides)
    await store.save()
}
