import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { createSelectionStore } from "../sidebar/selection"
import { TaskSelectionContext } from "./use-task-selection"
import { SelectionBarInset, TaskSelectionBar } from "./TaskSelectionBar"

let store: ReturnType<typeof createSelectionStore>

const setup = () => render(
    <TaskSelectionContext.Provider value={store}>
        <TaskSelectionBar />
    </TaskSelectionContext.Provider>,
)
const select = (...ids: number[]) => act(() => { ids.forEach(id => store.toggle(`task-${id}`)) })

beforeEach(() => {
    store = createSelectionStore()
    store.sync(["task-1", "task-2", "task-3", "task-4"])
})

describe("TaskSelectionBar", () => {
    it("shows no counter with nothing or one task selected", () => {
        setup()
        expect(screen.queryByTestId("selection-count")).not.toBeInTheDocument()
        select(1)
        expect(screen.queryByTestId("selection-count")).not.toBeInTheDocument()
        expect(screen.getByRole("status")).toBeEmptyDOMElement()
    })

    it("shows the number of selected tasks from 2 on and follows the changes", () => {
        setup()
        select(1, 2)
        expect(screen.getByTestId("selection-count")).toHaveTextContent("2 selezionati")
        select(3)
        expect(screen.getByTestId("selection-count")).toHaveTextContent("3 selezionati")
        select(3)
        expect(screen.getByTestId("selection-count")).toHaveTextContent("2 selezionati")
        select(2)
        // Down to one task: no counter any more
        expect(screen.queryByTestId("selection-count")).not.toBeInTheDocument()
    })

    it("is announced politely and goes away when the selection is cleared", () => {
        setup()
        select(1, 2)
        expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
        act(() => store.reset())
        expect(screen.queryByTestId("selection-count")).not.toBeInTheDocument()
    })

    it("works outside a selection provider (nothing shown)", () => {
        render(<TaskSelectionBar />)
        expect(screen.queryByTestId("selection-count")).not.toBeInTheDocument()
    })
})

describe("SelectionBarInset", () => {
    const setupInset = () => render(
        <TaskSelectionContext.Provider value={store}>
            <SelectionBarInset data-testid="scroll" className="p-2" />
        </TaskSelectionContext.Provider>,
    )

    it("reserves room at the bottom for the pill only with 2 or more tasks selected", () => {
        setupInset()
        const scroll = screen.getByTestId("scroll")
        expect(scroll).toHaveClass("p-2")
        expect(scroll).not.toHaveClass("pb-14")
        select(1)
        expect(scroll).not.toHaveClass("pb-14")
        select(2)
        expect(scroll).toHaveClass("pb-14")
        select(2)
        expect(scroll).not.toHaveClass("pb-14")
    })
})
