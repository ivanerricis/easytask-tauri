import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Group } from "./Group"
import { makeGroup } from "@/test/ui-fixtures"

const groupOpen = { value: true }
vi.mock("@/contexts/use-tabs", () => ({ useGroupOpen: () => [groupOpen.value, vi.fn()] }))
vi.mock("../note-dnd-state", () => ({
    useNoteDrop: () => ({ setNodeRef: vi.fn(), zone: null, active: null }),
    useNoteDrag: () => ({ setNodeRef: vi.fn(), setActivatorNodeRef: vi.fn(), attributes: {}, listeners: {}, isDragging: false }),
}))
vi.mock("./GroupHeader", () => ({ GroupHeader: () => <div>header</div> }))
vi.mock("./GroupAudioFiles", () => ({ GroupAudioFiles: () => null }))
vi.mock("../section/Section", () => ({ Section: () => <div>section</div> }))
vi.mock("../section/AddSection", () => ({ AddSection: () => <div>add section</div> }))

class FakeResizeObserver {
    static instances: FakeResizeObserver[] = []
    disconnected = false
    callback: () => void
    constructor(callback: () => void) {
        this.callback = callback
        FakeResizeObserver.instances.push(this)
    }
    observe() { /* the width is read by the callback */ }
    disconnect() { this.disconnected = true }
    fire() { this.callback() }
}

let width = 0

beforeEach(() => {
    groupOpen.value = true
    FakeResizeObserver.instances = []
    vi.stubGlobal("ResizeObserver", FakeResizeObserver)
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width }) as DOMRect)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

/** The root element of the group (the one that gets the minimum width). */
const root = () => screen.getByText("header").parentElement as HTMLElement

describe("Group width when collapsed", () => {
    it("keeps the width it had while open", () => {
        width = 311.4
        const group = makeGroup({ id: 101 })
        const { rerender } = render(<Group group={group} />)
        expect(root().style.minWidth).toBe("")

        groupOpen.value = false
        rerender(<Group group={group} />)

        expect(screen.queryByText("section")).not.toBeInTheDocument()
        expect(root().style.minWidth).toBe("311.4px")
    })

    it("follows the width of the open group when its content changes", () => {
        width = 300
        const group = makeGroup({ id: 102 })
        const { rerender } = render(<Group group={group} />)

        width = 340
        FakeResizeObserver.instances.at(-1)?.fire()
        groupOpen.value = false
        rerender(<Group group={group} />)

        expect(root().style.minWidth).toBe("340px")
    })

    it("stops observing as soon as the group is collapsed, so the shrunk width is never recorded", () => {
        width = 320
        const group = makeGroup({ id: 103 })
        const { rerender } = render(<Group group={group} />)
        const observer = FakeResizeObserver.instances.at(-1)

        groupOpen.value = false
        width = 120 // what the collapsed group would measure
        rerender(<Group group={group} />)

        expect(observer?.disconnected).toBe(true)
        expect(root().style.minWidth).toBe("320px")
    })

    it("sets no explicit width on a group that has never been open", () => {
        groupOpen.value = false
        width = 120
        render(<Group group={makeGroup({ id: 104 })} />)
        expect(root().style.minWidth).toBe("")
        expect(FakeResizeObserver.instances).toHaveLength(0)
    })
})

