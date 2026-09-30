import { describe, expect, it } from "vitest"
import { initialTabsState, tabsReducer, type TabsState } from "./tabs-reducer"

const state = (openIds: number[], activeId: number | null): TabsState => ({ openIds, activeId })

describe("tabsReducer", () => {
    describe("open", () => {
        it("appends a new tab and activates it", () => {
            expect(tabsReducer(state([1, 2], 1), { type: "open", id: 3 })).toEqual(state([1, 2, 3], 3))
        })

        it("only activates a tab that is already open, without moving it", () => {
            expect(tabsReducer(state([1, 2, 3], 3), { type: "open", id: 1 })).toEqual(state([1, 2, 3], 1))
        })

        it("returns the same state when the note is already the active tab", () => {
            const current = state([1, 2], 2)
            expect(tabsReducer(current, { type: "open", id: 2 })).toBe(current)
        })
    })

    describe("activate", () => {
        it("activates an open tab and ignores unknown ids", () => {
            const current = state([1, 2], 1)
            expect(tabsReducer(current, { type: "activate", id: 2 })).toEqual(state([1, 2], 2))
            expect(tabsReducer(current, { type: "activate", id: 9 })).toBe(current)
        })
    })

    describe("close", () => {
        it("activates the next tab when the active one is closed", () => {
            expect(tabsReducer(state([1, 2, 3], 2), { type: "close", id: 2 })).toEqual(state([1, 3], 3))
        })

        it("activates the previous tab when the last one is closed", () => {
            expect(tabsReducer(state([1, 2, 3], 3), { type: "close", id: 3 })).toEqual(state([1, 2], 2))
        })

        it("activates the first tab when the first one is closed", () => {
            expect(tabsReducer(state([1, 2, 3], 1), { type: "close", id: 1 })).toEqual(state([2, 3], 2))
        })

        it("leaves no active tab when the only one is closed", () => {
            expect(tabsReducer(state([1], 1), { type: "close", id: 1 })).toEqual(state([], null))
        })

        it("keeps the active tab when a background tab is closed", () => {
            expect(tabsReducer(state([1, 2, 3], 2), { type: "close", id: 3 })).toEqual(state([1, 2], 2))
            expect(tabsReducer(state([1, 2, 3], 2), { type: "close", id: 1 })).toEqual(state([2, 3], 2))
        })

        it("ignores unknown ids", () => {
            const current = state([1, 2], 1)
            expect(tabsReducer(current, { type: "close", id: 7 })).toBe(current)
        })
    })

    describe("closeMany", () => {
        it("closes several tabs and picks the neighbour of the active one among the remaining", () => {
            // Active 3 closed together with 2 and 4: the tab that took its place is 5
            expect(tabsReducer(state([1, 2, 3, 4, 5], 3), { type: "closeMany", ids: [2, 3, 4] })).toEqual(state([1, 5], 5))
        })

        it("falls back to the previous tab when nothing follows", () => {
            expect(tabsReducer(state([1, 2, 3, 4], 3), { type: "closeMany", ids: [3, 4] })).toEqual(state([1, 2], 2))
        })

        it("keeps the active tab when it is not among the closed ones", () => {
            expect(tabsReducer(state([1, 2, 3], 1), { type: "closeMany", ids: [2, 3] })).toEqual(state([1], 1))
        })

        it("empties the tabs when all of them are closed", () => {
            expect(tabsReducer(state([1, 2], 2), { type: "closeMany", ids: [1, 2] })).toEqual(state([], null))
        })
    })

    describe("closeActive / closeAll", () => {
        it("closes the active tab with the neighbour rule", () => {
            expect(tabsReducer(state([1, 2, 3], 1), { type: "closeActive" })).toEqual(state([2, 3], 2))
        })

        it("closeActive does nothing without an active tab", () => {
            expect(tabsReducer(initialTabsState, { type: "closeActive" })).toBe(initialTabsState)
        })

        it("closeAll empties the tabs", () => {
            expect(tabsReducer(state([1, 2], 2), { type: "closeAll" })).toEqual(state([], null))
        })
    })

    describe("reorder", () => {
        it("moves the tab and activates it", () => {
            expect(tabsReducer(state([1, 2, 3], 1), { type: "reorder", from: 0, to: 2 })).toEqual(state([2, 3, 1], 1))
            expect(tabsReducer(state([1, 2, 3], 1), { type: "reorder", from: 2, to: 0 })).toEqual(state([3, 1, 2], 3))
        })

        it("ignores no-op and out of range moves", () => {
            const current = state([1, 2, 3], 2)
            expect(tabsReducer(current, { type: "reorder", from: 1, to: 1 })).toBe(current)
            expect(tabsReducer(current, { type: "reorder", from: 0, to: 5 })).toBe(current)
            expect(tabsReducer(current, { type: "reorder", from: -1, to: 1 })).toBe(current)
        })
    })

    describe("prune", () => {
        it("closes the tabs whose note no longer exists, selecting the neighbour", () => {
            expect(tabsReducer(state([1, 2, 3], 2), { type: "prune", existing: new Set([1, 3]) })).toEqual(state([1, 3], 3))
        })

        it("returns the same state when every tab still exists", () => {
            const current = state([1, 2], 1)
            expect(tabsReducer(current, { type: "prune", existing: new Set([1, 2, 3]) })).toBe(current)
        })
    })

    describe("restore / hydrate", () => {
        it("restore replaces the state", () => {
            expect(tabsReducer(state([1], 1), { type: "restore", state: state([4, 5], 5) })).toEqual(state([4, 5], 5))
        })

        it("hydrate applies only when no tab is open yet", () => {
            expect(tabsReducer(initialTabsState, { type: "hydrate", state: state([4, 5], 5) })).toEqual(state([4, 5], 5))
            const current = state([1], 1)
            expect(tabsReducer(current, { type: "hydrate", state: state([4, 5], 5) })).toBe(current)
        })
    })
})
