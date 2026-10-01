/**
 * State of the open note tabs: the ordered ids of the open notes and the id of the active one.
 * Only ids are stored, the Note objects are derived from the live notes list.
 * @category Tabs
 */
export type TabsState = {
    openIds: number[]
    activeId: number | null
}

export type TabsAction =
    | { type: "open", id: number }
    | { type: "activate", id: number }
    | { type: "close", id: number }
    | { type: "closeMany", ids: readonly number[] }
    | { type: "closeActive" }
    | { type: "closeAll" }
    | { type: "reorder", from: number, to: number }
    /** Closes the tabs whose id is not in `existing` (deleted, trashed or from another workspace). */
    | { type: "prune", existing: ReadonlySet<number> }
    /** Replaces the whole state (reset on workspace change). */
    | { type: "restore", state: TabsState }
    /** Restores a saved state, unless the user already opened a tab in the meantime. */
    | { type: "hydrate", state: TabsState }
    /** Reopens the tabs of a snapshot that were closed meanwhile (a failed delete): the others stay as they are. */
    | { type: "reopen", state: TabsState }

export const initialTabsState: TabsState = { openIds: [], activeId: null }

/**
 * Closes the given tabs. When the active tab is closed, the neighbour takes its place: the tab that followed it,
 * or the previous one if it was the last, or none if no tab is left. Closing another tab keeps the active one.
 * @param state The current state.
 * @param ids The ids of the tabs to close.
 * @returns The new state (the same object if nothing changed).
 * @category Tabs
 */
function closeTabs(state: TabsState, ids: ReadonlySet<number>): TabsState {
    if (!state.openIds.some(id => ids.has(id))) return state
    const openIds = state.openIds.filter(id => !ids.has(id))

    let activeId = state.activeId
    if (activeId !== null && ids.has(activeId)) {
        const activeIndex = state.openIds.indexOf(activeId)
        const neighbourIndex = state.openIds.slice(0, activeIndex).filter(id => !ids.has(id)).length
        activeId = openIds[neighbourIndex] ?? openIds[openIds.length - 1] ?? null
    }
    return { openIds, activeId }
}

/**
 * Reducer of the open note tabs.
 * @param state The current state.
 * @param action The action to apply.
 * @returns The new state (the same object if the action changes nothing).
 * @category Tabs
 */
export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
    switch (action.type) {
        case "open": {
            const openIds = state.openIds.includes(action.id) ? state.openIds : [...state.openIds, action.id]
            if (openIds === state.openIds && state.activeId === action.id) return state
            return { openIds, activeId: action.id }
        }
        case "activate":
            if (!state.openIds.includes(action.id) || state.activeId === action.id) return state
            return { ...state, activeId: action.id }
        case "close":
            return closeTabs(state, new Set([action.id]))
        case "closeMany":
            return closeTabs(state, new Set(action.ids))
        case "closeActive":
            return state.activeId === null ? state : closeTabs(state, new Set([state.activeId]))
        case "closeAll":
            return state.openIds.length === 0 && state.activeId === null ? state : initialTabsState
        case "reorder": {
            const { from, to } = action
            if (from === to || from < 0 || to < 0 || from >= state.openIds.length || to >= state.openIds.length) return state
            const openIds = [...state.openIds]
            const [moved] = openIds.splice(from, 1)
            openIds.splice(to, 0, moved)
            // Dragging a tab also activates it
            return { openIds, activeId: moved }
        }
        case "prune": {
            const missing = state.openIds.filter(id => !action.existing.has(id))
            return missing.length === 0 ? state : closeTabs(state, new Set(missing))
        }
        case "restore":
            return action.state
        case "reopen": {
            const current = new Set(state.openIds)
            const closed = action.state.openIds.filter(id => !current.has(id))
            if (closed.length === 0) return state
            const wasOpen = new Set(action.state.openIds)
            const openIds = [...action.state.openIds, ...state.openIds.filter(id => !wasOpen.has(id))]
            const activeId = action.state.activeId !== null && closed.includes(action.state.activeId) ? action.state.activeId : state.activeId
            return { openIds, activeId }
        }
        case "hydrate":
            return state.openIds.length === 0 ? action.state : state
    }
}
