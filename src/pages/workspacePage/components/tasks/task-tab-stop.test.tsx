import { useEffect } from "react"
import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createTaskTabStopStore, TaskTabStopProvider, useIsTaskTabStop, useTaskTabStopStore } from "./task-tab-stop"

let renders: Record<number, number> = {}
const Row = ({ id }: { id: number }) => {
    useEffect(() => { renders[id] = (renders[id] ?? 0) + 1 })
    return <span data-testid={`row-${id}`}>{String(useIsTaskTabStop("list", id))}</span>
}
const Setter = () => {
    const store = useTaskTabStopStore()
    return <button onClick={() => store?.set(2)}>go</button>
}

describe("task tab stop", () => {
    it("the store notifies only when the value changes", () => {
        const store = createTaskTabStopStore()
        let calls = 0
        store.subscribe(() => { calls++ })
        store.set(1)
        store.set(1)
        store.set(null)
        expect(calls).toBe(2)
    })

    it("a row alone is its own tab stop", () => {
        render(<Row id={1} />)
        expect(screen.getByTestId("row-1").textContent).toBe("true")
    })

    it("in a list only the active row is the tab stop, and a move re-renders just the two rows involved", () => {
        renders = {}
        render(
            <TaskTabStopProvider listKey="list">
                <Row id={1} /><Row id={2} /><Row id={3} /><Setter />
            </TaskTabStopProvider>,
        )
        const texts = () => [1, 2, 3].map(i => screen.getByTestId(`row-${i}`).textContent)
        expect(texts()).toEqual(["false", "false", "false"])
        const before = { ...renders }
        act(() => { screen.getByText("go").click() })
        expect(texts()).toEqual(["false", "true", "false"])
        expect(renders[1]).toBe(before[1])
        expect(renders[3]).toBe(before[3])
        expect(renders[2]).toBeGreaterThan(before[2])
    })

    it("a row of another list is not affected by the provider", () => {
        render(<TaskTabStopProvider listKey="other"><Row id={1} /></TaskTabStopProvider>)
        expect(screen.getByTestId("row-1").textContent).toBe("true")
    })
})
