import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Group } from "./Group"
import { makeDefaultSection, makeGroup, makeSection } from "@/test/ui-fixtures"

const groupOpen = { value: true }
const toggleOpen = vi.fn()
vi.mock("@/contexts/use-tabs", () => ({ useGroupOpen: () => [groupOpen.value, toggleOpen] }))
vi.mock("../note-dnd-state", () => ({
    useNoteDrop: () => ({ setNodeRef: vi.fn(), zone: null, active: null }),
    useNoteDrag: () => ({ setNodeRef: vi.fn(), setActivatorNodeRef: vi.fn(), attributes: {}, listeners: {}, isDragging: false }),
}))
// The header is a sibling of the button that stands for the "Nuova sezione" entry of its menu
vi.mock("./GroupHeader", () => ({
    GroupHeader: ({ onAddSection }: { onAddSection?: () => void }) => <><div>header</div><button onClick={onAddSection}>menu nuova sezione</button></>,
}))
vi.mock("./GroupAudioFiles", () => ({ GroupAudioFiles: () => null }))
vi.mock("../section/Section", () => ({ Section: () => <div>section</div> }))
vi.mock("./GroupTasks", () => ({ GroupTasks: () => <div>direct tasks</div> }))
vi.mock("../section/AddSection", () => ({
    AddSection: ({ open, onClose }: { open?: boolean, onClose?: () => void }) => open ? <button onClick={onClose}>form sezione</button> : null,
}))

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
    toggleOpen.mockClear()
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
        // A new object: Group is memoized, and the mocked open state changes outside of it
        rerender(<Group group={{ ...group }} />)

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
        rerender(<Group group={{ ...group }} />)

        expect(root().style.minWidth).toBe("340px")
    })

    it("stops observing as soon as the group is collapsed, so the shrunk width is never recorded", () => {
        width = 320
        const group = makeGroup({ id: 103 })
        const { rerender } = render(<Group group={group} />)
        const observer = FakeResizeObserver.instances.at(-1)

        groupOpen.value = false
        width = 120 // what the collapsed group would measure
        rerender(<Group group={{ ...group }} />)

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


describe("Group content", () => {
    it("shows the direct tasks first, then the sections, and no section button", () => {
        const group = makeGroup({ id: 110, defaultSection: makeDefaultSection({ id: 5 }), sections: [makeSection({ id: 6 })] })
        render(<Group group={group} />)

        const order = [screen.getByText("direct tasks"), screen.getByText("section")]
        expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(screen.queryByRole("button", { name: /Nuova sezione/ })).not.toBeInTheDocument()
        expect(screen.queryByText("form sezione")).not.toBeInTheDocument()
    })

    it("still shows the direct tasks area in a group without sections", () => {
        render(<Group group={makeGroup({ id: 111, defaultSection: makeDefaultSection({ id: 5 }) })} />)
        expect(screen.getByText("direct tasks")).toBeInTheDocument()
        expect(screen.queryByText("section")).not.toBeInTheDocument()
    })

    it("opens the form of a new section from the menu of the group and closes it again", () => {
        render(<Group group={makeGroup({ id: 112 })} />)
        fireEvent.click(screen.getByText("menu nuova sezione"))
        expect(toggleOpen).not.toHaveBeenCalled()

        fireEvent.click(screen.getByText("form sezione"))
        expect(screen.queryByText("form sezione")).not.toBeInTheDocument()
    })

    it("expands a collapsed group when a section is asked from its menu", () => {
        groupOpen.value = false
        render(<Group group={makeGroup({ id: 113 })} />)
        fireEvent.click(screen.getByText("menu nuova sezione"))
        expect(toggleOpen).toHaveBeenCalledTimes(1)
    })

    it("shows only the header while collapsed", () => {
        groupOpen.value = false
        render(<Group group={makeGroup({ id: 114, defaultSection: makeDefaultSection({ id: 5 }), sections: [makeSection({ id: 6 })] })} />)
        expect(screen.getByText("header")).toBeInTheDocument()
        expect(screen.queryByText("direct tasks")).not.toBeInTheDocument()
        expect(screen.queryByText("section")).not.toBeInTheDocument()
    })
})
