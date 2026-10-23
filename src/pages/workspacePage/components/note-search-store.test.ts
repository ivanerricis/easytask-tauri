import { describe, expect, it, vi } from "vitest"
import type { SearchMatch } from "./note-search"
import { activeOccurrenceOf, createNoteSearchStore } from "./note-search-store"

const match = (kind: SearchMatch["kind"], itemId: number, occurrence = 0): SearchMatch => ({
    id: `${kind}-${itemId}#${occurrence}`, key: `${kind}-${itemId}`, kind, itemId, groupId: 1, taskPath: [], occurrence,
})
const three = [match("task", 1), match("task", 2), match("task", 3)]

describe("note search store", () => {
    it("starts closed and empty, opens, sets the query and closes clearing everything", () => {
        const store = createNoteSearchStore()
        expect(store.getState()).toMatchObject({ open: false, query: "", matches: [] })
        store.open()
        store.setQuery("ab")
        store.setMatches(three, true)
        expect(store.getState()).toMatchObject({ open: true, query: "ab", activeIndex: 0 })
        store.close()
        expect(store.getState()).toMatchObject({ open: false, query: "", matches: [], activeIndex: 0 })
    })

    it("steps through the matches wrapping around, and asks to bring each one into view", () => {
        const store = createNoteSearchStore()
        store.setMatches(three, true)
        const tick = store.getState().revealTick
        store.step(-1)
        expect(store.getState().activeIndex).toBe(2)
        store.step(1)
        store.step(1)
        expect(store.getState().activeIndex).toBe(1)
        expect(store.getState().revealTick).toBe(tick + 3)
    })

    it("does nothing when stepping without matches", () => {
        const store = createNoteSearchStore()
        const listener = vi.fn()
        store.subscribe(listener)
        store.step(1)
        store.setMatches([], true)
        expect(listener).not.toHaveBeenCalled()
    })

    it("keeps the current match when the tree changes, and clamps when it disappears", () => {
        const store = createNoteSearchStore()
        store.setMatches(three, true)
        store.step(1)
        store.step(1)
        const tick = store.getState().revealTick
        store.setMatches([match("task", 0), ...three])
        expect(store.getState().activeIndex).toBe(3)
        expect(store.getState().revealTick).toBe(tick)
        store.setMatches([match("task", 1)])
        expect(store.getState().activeIndex).toBe(0)
    })

    it("a new query goes back to the first match", () => {
        const store = createNoteSearchStore()
        store.setMatches(three, true)
        store.step(1)
        store.setMatches(three.slice(1), true)
        expect(store.getState().activeIndex).toBe(0)
    })

    it("tells which occurrence of an item is the current one, only while open", () => {
        const store = createNoteSearchStore()
        store.setMatches([match("task", 1), match("task", 1, 1)], true)
        expect(activeOccurrenceOf(store.getState(), "task", 1)).toBe(-1)
        store.open()
        expect(activeOccurrenceOf(store.getState(), "task", 1)).toBe(0)
        store.step(1)
        expect(activeOccurrenceOf(store.getState(), "task", 1)).toBe(1)
        expect(activeOccurrenceOf(store.getState(), "group", 1)).toBe(-1)
    })
})
