import { SHORTCUTS, type Binding } from "@/lib/shortcuts"
import { store } from "./initStore"

const SHORTCUT_OVERRIDES_KEY = "shortcutOverrides"

const isOptionalBoolean = (value: unknown) => value === undefined || typeof value === "boolean"

/**
 * Keeps only the usable overrides of a stored value: the id must be an editable, actionable shortcut and the binding
 * must have a non-empty string `key` and boolean-or-missing modifiers. Anything else (a stale id, a corrupted file) is dropped.
 * @param value The stored value (unknown shape).
 * @returns The valid overrides (empty when the value is not an object).
 * @category Store
 */
export const sanitizeShortcutOverrides = (value: unknown): Record<string, Binding> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const result: Record<string, Binding> = {}
    for (const [id, raw] of Object.entries(value)) {
        const shortcut = SHORTCUTS.find(s => s.id === id)
        if (!shortcut || !shortcut.editable || !shortcut.defaultBinding) continue
        if (!raw || typeof raw !== "object") continue
        const { key, ctrl, alt, shift } = raw as Record<string, unknown>
        if (typeof key !== "string" || key === "") continue
        if (!isOptionalBoolean(ctrl) || !isOptionalBoolean(alt) || !isOptionalBoolean(shift)) continue
        const binding: Binding = { key }
        if (ctrl !== undefined) binding.ctrl = ctrl as boolean
        if (alt !== undefined) binding.alt = alt as boolean
        if (shift !== undefined) binding.shift = shift as boolean
        result[id] = binding
    }
    return result
}

/**
 * Gets the user-customized shortcut bindings (sanitized: invalid entries are ignored).
 * @returns A promise that resolves to a map from shortcut id to binding (empty when nothing is customized).
 * @category Store
 */
export const getShortcutOverrides = async (): Promise<Record<string, Binding>> =>
    sanitizeShortcutOverrides(await store.get<unknown>(SHORTCUT_OVERRIDES_KEY))

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
