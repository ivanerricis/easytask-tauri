import { initialTabsState, tabsReducer, type TabsAction, type TabsState } from "./tabs-reducer"

/**
 * Index of a pane of the split workspace: 0 is the left one (always present), 1 the right one.
 * @category Tabs
 */
export type PaneIndex = 0 | 1

/**
 * Layout of the open notes: up to two panes side by side, each with its own tabs, and the pane that has the focus.
 * A note is open in at most one pane. `focused` is always 0 when `right` is null.
 * @category Tabs
 */
export type LayoutState = {
    left: TabsState
    right: TabsState | null
    focused: PaneIndex
}

export const initialLayoutState: LayoutState = { left: initialTabsState, right: null, focused: 0 }

/** The actions that act on the tabs of a single pane. */
type PaneScoped = Extract<TabsAction, { type: "open" | "activate" | "closeActive" | "cycle" | "reorder" }>

export type LayoutAction =
    /** Applies a tab action to a pane and focuses it; "open" there moves the note from the other pane if it is in it. */
    | { type: "pane", pane: PaneIndex, action: PaneScoped }
    /** Opens the note in the focused pane, or activates it (and focuses its pane) when it is already open in a pane. */
    | { type: "open", id: number }
    /** Activates the note in whichever pane holds it and focuses that pane. */
    | { type: "activate", id: number }
    /**
     * Moves a note to a pane in one step (the right pane is created if needed): the note becomes the active one of the
     * target pane, which gets the focus. `index` is the final position in the target tabs (clamped; the end by default).
     * A note that is not open anywhere is simply opened in the target pane.
     */
    | { type: "moveToPane", id: number, pane: PaneIndex, index?: number }
    | { type: "close", id: number }
    | { type: "closeMany", ids: readonly number[] }
    /** Closes the active tab of the focused pane. */
    | { type: "closeActive" }
    /** Activates the next (1) or previous (-1) tab of the focused pane, wrapping around. */
    | { type: "cycle", direction: 1 | -1 }
    /** Closes every tab of both panes and goes back to a single pane. */
    | { type: "closeAll" }
    /** Adds an empty right pane and focuses it (nothing if already split). */
    | { type: "split" }
    /** Closes the tabs of the right pane and goes back to a single pane. */
    | { type: "unsplit" }
    | { type: "focus", pane: PaneIndex }
    /** Closes the tabs whose id is not in `existing`, in both panes. */
    | { type: "prune", existing: ReadonlySet<number> }
    /** Replaces the whole state (normalized). */
    | { type: "restore" | "hydrate" | "reopen", state: LayoutState }

/**
 * The tabs of a pane.
 * @returns The state of the pane, or null for the right pane when the workspace is not split.
 * @category Tabs
 */
export function paneOf(state: LayoutState, pane: PaneIndex): TabsState | null {
    return pane === 0 ? state.left : state.right
}

/**
 * The pane that holds a note.
 * @returns The pane index, or null if the note is not open.
 * @category Tabs
 */
export function findPane(state: LayoutState, noteId: number): PaneIndex | null {
    if (state.left.openIds.includes(noteId)) return 0
    if (state.right?.openIds.includes(noteId)) return 1
    return null
}

/**
 * The ids of all the open notes: the left pane first, then the right one.
 * @category Tabs
 */
export function unionOpenIds(state: LayoutState): number[] {
    return state.right ? [...state.left.openIds, ...state.right.openIds] : state.left.openIds
}

/**
 * The tabs of the focused pane.
 * @category Tabs
 */
export function focusedPane(state: LayoutState): TabsState {
    return paneOf(state, state.focused) ?? state.left
}

/** Removes the duplicated ids (the first occurrence stays) and the ids in `taken`; the active id falls back to the first tab. */
function normalizePane(tabs: TabsState, taken: ReadonlySet<number>): TabsState {
    const seen = new Set<number>()
    const openIds = tabs.openIds.filter(id => {
        if (seen.has(id) || taken.has(id)) return false
        seen.add(id)
        return true
    })
    const activeId = tabs.activeId !== null && seen.has(tabs.activeId) ? tabs.activeId : (openIds[0] ?? null)
    if (openIds.length === tabs.openIds.length && activeId === tabs.activeId) return tabs
    return { openIds, activeId }
}

/**
 * Brings a layout to a valid shape: no duplicated note (a note found in both panes stays in the LEFT one, i.e. the first
 * occurrence left to right wins), an active id that is one of the open ids, an empty left pane replaced by the right
 * one when that has tabs, and `focused` equal to 0 without right pane. An empty right pane is kept: it is what
 * "split" creates and it stays until used or closed.
 * @returns The same object if it was already valid.
 * @category Tabs
 */
export function normalizeLayout(state: LayoutState): LayoutState {
    const left = normalizePane(state.left, new Set())
    const right = state.right ? normalizePane(state.right, new Set(left.openIds)) : null
    if (right && left.openIds.length === 0 && right.openIds.length > 0) return { left: right, right: null, focused: 0 }
    const focused: PaneIndex = right ? state.focused : 0
    if (left === state.left && right === state.right && focused === state.focused) return state
    return { left, right, focused }
}

/** Collapses the panes after tabs were removed: a right pane that has just been emptied closes, an empty left one is replaced by the right one. */
function collapse(prev: LayoutState, next: LayoutState): LayoutState {
    const { left, right } = next
    if (right && right.openIds.length === 0 && (prev.right?.openIds.length ?? 0) > 0) {
        return { left, right: null, focused: 0 }
    }
    if (right && left.openIds.length === 0 && right.openIds.length > 0) return { left: right, right: null, focused: 0 }
    return next
}

/** The state with a pane replaced (the same object if the pane is the same). */
function withPane(state: LayoutState, pane: PaneIndex, tabs: TabsState): LayoutState {
    if (paneOf(state, pane) === tabs) return state
    return pane === 0 ? { ...state, left: tabs } : { ...state, right: tabs }
}

function withFocus(state: LayoutState, pane: PaneIndex): LayoutState {
    if (state.focused === pane || (pane === 1 && !state.right)) return state
    return { ...state, focused: pane }
}

function moveToPane(state: LayoutState, id: number, pane: PaneIndex, index: number | undefined): LayoutState {
    const source = findPane(state, id)
    if (source === pane) {
        const tabs = paneOf(state, pane)!
        let next = state
        if (index !== undefined) {
            const to = Math.min(Math.max(index, 0), tabs.openIds.length - 1)
            next = withPane(next, pane, tabsReducer(tabs, { type: "reorder", from: tabs.openIds.indexOf(id), to }))
        }
        return withFocus(withPane(next, pane, tabsReducer(paneOf(next, pane)!, { type: "activate", id })), pane)
    }
    const afterRemoval = source === null ? state : withPane(state, source, tabsReducer(paneOf(state, source)!, { type: "close", id }))
    const target = paneOf(afterRemoval, pane) ?? initialTabsState
    const at = index === undefined ? target.openIds.length : Math.min(Math.max(index, 0), target.openIds.length)
    const openIds = [...target.openIds]
    openIds.splice(at, 0, id)
    const next: LayoutState = pane === 0
        ? { ...afterRemoval, left: { openIds, activeId: id }, focused: 0 }
        : { ...afterRemoval, right: { openIds, activeId: id }, focused: 1 }
    return collapse(state, next)
}

/** Applies a tab action to every pane (the actions that do not depend on the focus). */
function applyToBoth(state: LayoutState, action: TabsAction): LayoutState {
    const left = tabsReducer(state.left, action)
    const right = state.right ? tabsReducer(state.right, action) : null
    if (left === state.left && right === state.right) return state
    return collapse(state, { ...state, left, right })
}

/** A pane rebuilt by `reopen`: the saved ids first (original order), then the notes opened since the snapshot that already live in the pane. */
function reopenedPane(current: TabsState | null, from: TabsState, saved: ReadonlySet<number>, closed: ReadonlySet<number>): TabsState {
    const extras = (current?.openIds ?? []).filter(id => !saved.has(id))
    const openIds = [...from.openIds, ...extras]
    const keep = (id: number | null | undefined) => (id !== null && id !== undefined && openIds.includes(id) ? id : null)
    const activeId = (from.activeId !== null && closed.has(from.activeId) ? keep(from.activeId) : null)
        ?? keep(current?.activeId) ?? keep(from.activeId) ?? (openIds[0] ?? null)
    return { openIds, activeId }
}

function reopen(state: LayoutState, snapshot: LayoutState): LayoutState {
    const saved = normalizeLayout(snapshot)
    const open = new Set(unionOpenIds(state))
    if (!unionOpenIds(saved).some(id => !open.has(id))) return state
    if (saved.right) {
        // A two-pane snapshot: each note goes back to its pane, also one that was promoted to the other pane by a collapse
        const savedIds = new Set(unionOpenIds(saved))
        const closed = new Set([...savedIds].filter(id => !open.has(id)))
        const left = reopenedPane(state.left, saved.left, savedIds, closed)
        const right = reopenedPane(state.right, saved.right, savedIds, closed)
        // The split is restored only when a tab comes back to the right pane
        const keptRight = state.right === null && right.openIds.length === 0 ? null : right
        return normalizeLayout({ left, right: keptRight, focused: state.focused })
    }
    const inRight = new Set(state.right?.openIds ?? [])
    const left = tabsReducer(state.left, { type: "reopen", state: { openIds: saved.left.openIds.filter(id => !inRight.has(id)), activeId: saved.left.activeId } })
    return normalizeLayout({ left, right: state.right, focused: state.focused })
}

/**
 * Reducer of the split workspace: it wraps `tabsReducer`, which runs on each pane. It keeps the layout valid: a note is
 * open in one pane only, the right pane closes when it is emptied by closing or moving its tabs, and the right pane
 * takes the place of the left one when that is emptied.
 * @param state The current layout.
 * @param action The action to apply.
 * @returns The new layout (the same object if the action changes nothing).
 * @category Tabs
 */
export function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
    switch (action.type) {
        case "pane": {
            const { pane, action: inner } = action
            const tabs = paneOf(state, pane)
            if (inner.type === "open") {
                if (!tabs || findPane(state, inner.id) !== pane) return moveToPane(state, inner.id, pane, undefined)
            }
            if (!tabs) return state
            const next = withPane(state, pane, tabsReducer(tabs, inner))
            return withFocus(next === state ? state : collapse(state, next), pane)
        }
        case "open": {
            const holder = findPane(state, action.id)
            if (holder !== null) return layoutReducer(state, { type: "activate", id: action.id })
            return withPane(state, state.focused, tabsReducer(focusedPane(state), { type: "open", id: action.id }))
        }
        case "activate": {
            const holder = findPane(state, action.id)
            if (holder === null) return state
            return withFocus(withPane(state, holder, tabsReducer(paneOf(state, holder)!, action)), holder)
        }
        case "moveToPane":
            return moveToPane(state, action.id, action.pane, action.index)
        case "close":
        case "closeMany":
            return applyToBoth(state, action)
        case "closeActive": {
            const next = withPane(state, state.focused, tabsReducer(focusedPane(state), action))
            return next === state ? state : collapse(state, next)
        }
        case "cycle":
            return withPane(state, state.focused, tabsReducer(focusedPane(state), action))
        case "closeAll":
            if (state.right === null && state.left.openIds.length === 0 && state.left.activeId === null) return state
            return initialLayoutState
        case "split":
            return state.right ? state : { ...state, right: initialTabsState, focused: 1 }
        case "unsplit":
            return state.right ? { left: state.left, right: null, focused: 0 } : state
        case "focus":
            return withFocus(state, action.pane)
        case "prune":
            return applyToBoth(state, action)
        case "restore":
            return normalizeLayout(action.state)
        case "hydrate":
            return unionOpenIds(state).length === 0 ? normalizeLayout(action.state) : state
        case "reopen":
            return reopen(state, action.state)
    }
}
