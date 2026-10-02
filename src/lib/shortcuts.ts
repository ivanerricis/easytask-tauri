import i18n from "@/i18n"

export type ShortcutCategory = "general" | "notes" | "groups" | "home"

// "global" shortcuts clash with every scope; "workspace" and "home" are separate pages and can reuse the same keys
export type ShortcutScope = "global" | "workspace" | "home"

/** `ctrl` matches both Ctrl and Cmd; `key` is compared case-insensitively against KeyboardEvent.key. */
export interface Binding {
    key: string
    ctrl?: boolean
    alt?: boolean
    shift?: boolean
}

export interface Shortcut {
    id: string
    category: ShortcutCategory
    scope: ShortcutScope
    editable: boolean
    // Present on every actionable shortcut
    defaultBinding?: Binding
    // Keys of documentation-only entries (no binding), as ShortcutKey names: see keyLabel
    keys?: ShortcutKey[]
}

type ShortcutId = keyof typeof import("@/i18n/locales/it").it.shortcuts.items

export type ShortcutKey = "enter" | "escape" | "shift" | "space" | "delete"

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = ["general", "notes", "groups", "home"]

/** The translated name of a category. */
export const categoryLabel = (category: ShortcutCategory): string => i18n.t(`shortcuts.categories.${category}`)

/** The translated description of a shortcut. */
export const shortcutDescription = (id: string): string =>
    i18n.t(`shortcuts.items.${id as ShortcutId}`)

/** The translated label of a named key ("Invio", "Esc"...). */
export const keyLabel = (key: ShortcutKey | "ctrl" | "alt"): string => i18n.t(`shortcuts.keys.${key}`)

// "?" is fixed: it needs Shift on most layouts and would clash with the modifier rule of the recorder.
export const SHORTCUTS: Shortcut[] = [
    { id: "show-shortcuts", defaultBinding: { key: "?" }, editable: false, scope: "global", category: "general" },
    { id: "go-home", defaultBinding: { key: "h", ctrl: true }, editable: true, scope: "workspace", category: "general" },
    { id: "toggle-sidebar", defaultBinding: { key: "b", ctrl: true }, editable: true, scope: "workspace", category: "general" },
    { id: "toggle-right-sidebar", defaultBinding: { key: "b", ctrl: true, shift: true }, editable: true, scope: "workspace", category: "general" },
    // Not active in text fields (they have their own undo); Ctrl+Shift+Z is the fixed alternative of redo
    { id: "undo", defaultBinding: { key: "z", ctrl: true }, editable: true, scope: "workspace", category: "general" },
    { id: "redo", defaultBinding: { key: "y", ctrl: true }, editable: true, scope: "workspace", category: "general" },
    { id: "redo-alt", defaultBinding: { key: "z", ctrl: true, shift: true }, editable: false, scope: "workspace", category: "general" },
    { id: "search-notes", defaultBinding: { key: "o", ctrl: true }, editable: true, scope: "workspace", category: "notes" },
    { id: "new-note", defaultBinding: { key: "n", ctrl: true }, editable: true, scope: "workspace", category: "notes" },
    { id: "new-folder", defaultBinding: { key: "m", ctrl: true }, editable: true, scope: "workspace", category: "notes" },
    { id: "close-note", defaultBinding: { key: "l", ctrl: true }, editable: true, scope: "workspace", category: "notes" },
    { id: "close-all-notes", defaultBinding: { key: "t", ctrl: true }, editable: true, scope: "workspace", category: "notes" },
    // Ctrl+H is go-home: the Shift variant is free
    { id: "toggle-hide-completed", defaultBinding: { key: "h", ctrl: true, shift: true }, editable: true, scope: "workspace", category: "notes" },
    // Plays or pauses the audio player while it is open
    { id: "toggle-audio", defaultBinding: { key: "p", alt: true }, editable: true, scope: "workspace", category: "notes" },
    { id: "new-group", defaultBinding: { key: "n", alt: true }, editable: true, scope: "workspace", category: "groups" },
    { id: "confirm-rename", keys: ["enter"], editable: false, scope: "workspace", category: "groups" },
    { id: "cancel-rename", keys: ["escape"], editable: false, scope: "workspace", category: "groups" },
    { id: "task-newline", keys: ["shift", "enter"], editable: false, scope: "workspace", category: "groups" },
    { id: "new-workspace", defaultBinding: { key: "n", ctrl: true }, editable: true, scope: "home", category: "home" },
]

export const getShortcut = (id: string): Shortcut => {
    const shortcut = SHORTCUTS.find(s => s.id === id)
    if (!shortcut) throw new Error(`Unknown shortcut: ${id}`)
    return shortcut
}

const isLetterOrDigit = (key: string) => /^[a-z0-9]$/i.test(key)

/** Whether a keyboard event triggers the binding. Ctrl/Alt must match exactly; Shift is ignored for symbols such as "?". */
export const matchBinding = (e: KeyboardEvent, binding: Binding): boolean => {
    if (typeof e.key !== "string" || e.key.toLowerCase() !== binding.key.toLowerCase()) return false
    if ((e.ctrlKey || e.metaKey) !== !!binding.ctrl) return false
    if (e.altKey !== !!binding.alt) return false
    if (binding.key.length === 1 && !isLetterOrDigit(binding.key)) return true
    return e.shiftKey === !!binding.shift
}

const KEY_LABELS: Record<string, () => string> = {
    enter: () => keyLabel("enter"),
    escape: () => keyLabel("escape"),
    " ": () => keyLabel("space"),
    arrowup: () => "↑",
    arrowdown: () => "↓",
    arrowleft: () => "←",
    arrowright: () => "→",
    delete: () => keyLabel("delete"),
}

export const formatBinding = (binding: Binding): string[] => {
    const parts: string[] = []
    if (binding.ctrl) parts.push(keyLabel("ctrl"))
    if (binding.alt) parts.push(keyLabel("alt"))
    if (binding.shift) parts.push(keyLabel("shift"))
    parts.push(KEY_LABELS[binding.key.toLowerCase()]?.() ?? (binding.key.length === 1 ? binding.key.toUpperCase() : binding.key))
    return parts
}

export const bindingEquals = (a: Binding, b: Binding): boolean =>
    a.key.toLowerCase() === b.key.toLowerCase() && !!a.ctrl === !!b.ctrl && !!a.alt === !!b.alt && !!a.shift === !!b.shift

export const scopesOverlap = (a: ShortcutScope, b: ShortcutScope): boolean => a === b || a === "global" || b === "global"

/** Ids of the shortcuts (other than `id`) that would clash with `binding` given the current bindings. */
export const findConflictsFor = (id: string, binding: Binding, bindings: Record<string, Binding>): string[] => {
    const scope = getShortcut(id).scope
    return Object.entries(bindings)
        .filter(([otherId, other]) => otherId !== id && scopesOverlap(scope, getShortcut(otherId).scope) && bindingEquals(binding, other))
        .map(([otherId]) => otherId)
}

/** Every pair of ids sharing a binding within overlapping scopes. */
export const findConflicts = (bindings: Record<string, Binding>): [string, string][] => {
    const ids = Object.keys(bindings)
    const pairs: [string, string][] = []
    ids.forEach((id, i) => {
        ids.slice(i + 1).forEach(other => {
            if (scopesOverlap(getShortcut(id).scope, getShortcut(other).scope) && bindingEquals(bindings[id], bindings[other])) pairs.push([id, other])
        })
    })
    return pairs
}

/** A recordable binding needs Ctrl or Alt, except for function keys. */
export const isValidBinding = (binding: Binding): boolean =>
    !!binding.ctrl || !!binding.alt || /^F\d{1,2}$/.test(binding.key)

/** The binding described by a keydown, or null for modifier-only presses. */
export const bindingFromEvent = (e: KeyboardEvent): Binding | null => {
    if (["Control", "Alt", "Shift", "Meta", "AltGraph"].includes(e.key)) return null
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
    const binding: Binding = { key }
    if (e.ctrlKey || e.metaKey) binding.ctrl = true
    if (e.altKey) binding.alt = true
    if (e.shiftKey && (key.length > 1 || isLetterOrDigit(key))) binding.shift = true
    return binding
}

/** Default bindings of every actionable shortcut. */
export const getDefaultBindings = (): Record<string, Binding> =>
    Object.fromEntries(SHORTCUTS.filter(s => s.defaultBinding).map(s => [s.id, s.defaultBinding as Binding]))
