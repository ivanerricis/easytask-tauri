import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useStoreSelector } from "@/lib/external-store"
import { makeGroup, makeSection, makeTask } from "@/test/ui-fixtures"
import type { NoteDataTree } from "@/types/types"
import { NoteSearchProvider, useNoteSearchStore, useSearchHighlight } from "./note-search-context"

let activeId: number | null = 1
let hideCompleted = false
let tree: NoteDataTree | null
// The search opens closed elements only for its own time: nothing is saved (no database, no patch of the note)
const uiStore = { setRevealed: vi.fn(), clearRevealed: vi.fn() }
vi.mock("@/contexts/use-tabs", () => ({ useActiveNoteId: () => activeId, useTabUiStore: () => uiStore }))
vi.mock("@/contexts/use-active-note", () => ({ useActiveNote: () => ({ noteDataTree: tree }) }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => ({ hideCompletedTasks: hideCompleted }) }))

const makeTree = (): NoteDataTree => ({
    groups: [makeGroup({
        id: 1, name: "Spesa",
        sections: [
            makeSection({ id: 10, title: "Frutta", tasks: [makeTask({ id: 1, text: "mele", subtasks: [makeTask({ id: 4, taskID: 1, text: "kiwi" })] }), makeTask({ id: 2, text: "pere", completed: true })] }),
            makeSection({ id: 11, title: "Altro", tasks: [makeTask({ id: 3, text: "mele verdi" })] }),
        ],
    })],
})

function Probe() {
    const store = useNoteSearchStore()!
    const task1 = useSearchHighlight("task", 1)
    const task3 = useSearchHighlight("task", 3)
    return (
        <>
            <output data-testid="t1">{task1.query}|{task1.active}</output>
            <output data-testid="t3">{task3.query}|{task3.active}</output>
            <output data-testid="count">{useStoreSelector(store, s => s.matches.length)}</output>
            <mark data-active="true">x</mark>
            <button onClick={() => { store.open(); store.setQuery("mele") }}>search</button>
            <button onClick={() => store.step(1)}>next</button>
            <button onClick={() => store.setQuery("pere")}>pere</button>
            <button onClick={() => { store.open(); store.setQuery("kiwi") }}>kiwi</button>
            <button onClick={() => store.close()}>close</button>
        </>
    )
}

const scrollIntoView = vi.fn()
const frames = () => act(async () => { await vi.advanceTimersByTimeAsync(200) })

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] })
    activeId = 1
    hideCompleted = false
    tree = makeTree()
    uiStore.setRevealed.mockReset()
    uiStore.clearRevealed.mockReset()
    scrollIntoView.mockReset()
    Element.prototype.scrollIntoView = scrollIntoView
})

describe("NoteSearchProvider", () => {
    it("finds the matches after the typing pauses and marks only the rows that hold one", async () => {
        render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("search").click() })
        await frames()
        expect(screen.getByTestId("count")).toHaveTextContent("2")
        expect(screen.getByTestId("t1")).toHaveTextContent("mele|0")
        expect(screen.getByTestId("t3")).toHaveTextContent("mele|-1")
    })

    it("moves to the next match, opens its closed group and section and scrolls it into view", async () => {
        render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("search").click() })
        await frames()
        act(() => { screen.getByText("next").click() })
        await frames()
        expect(screen.getByTestId("t3")).toHaveTextContent("mele|0")
        expect(uiStore.setRevealed).toHaveBeenCalledWith(1, "group", 1, true)
        expect(uiStore.setRevealed).toHaveBeenCalledWith(1, "section", 11, true)
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" })
    })

    it("opens the closed parents of a subtask that holds the match", async () => {
        render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("kiwi").click() })
        await frames()
        expect(uiStore.setRevealed).toHaveBeenCalledWith(1, "section", 10, true)
        expect(uiStore.setRevealed).toHaveBeenCalledWith(1, "task", 1, true)
        expect(uiStore.setRevealed).not.toHaveBeenCalledWith(1, "task", 4, true)
    })

    it("closes again what it opened when the search is closed, and never saves anything", async () => {
        render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("search").click() })
        await frames()
        expect(uiStore.clearRevealed).not.toHaveBeenCalled()
        act(() => { screen.getByText("close").click() })
        await frames()
        expect(uiStore.clearRevealed).toHaveBeenCalledWith(1)
        expect(uiStore.setRevealed.mock.calls.every(call => call[3] === true)).toBe(true)
    })

    it("does not count the hidden completed tasks", async () => {
        hideCompleted = true
        render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("search").click() })
        act(() => { screen.getByText("pere").click() })
        await frames()
        expect(screen.getByTestId("count")).toHaveTextContent("0")
    })

    it("clears the search when another note becomes active", async () => {
        const { rerender } = render(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        act(() => { screen.getByText("search").click() })
        await frames()
        activeId = 2
        rerender(<NoteSearchProvider><Probe /></NoteSearchProvider>)
        await frames()
        expect(screen.getByTestId("count")).toHaveTextContent("0")
        expect(screen.getByTestId("t1")).toHaveTextContent("|-1")
    })
})
