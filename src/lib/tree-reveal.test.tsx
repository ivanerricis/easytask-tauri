import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { TREE_REVEAL_EVENT, requestTreeReveal, useTreeRevealRequest } from "./tree-reveal"

const Listener = ({ handler }: { handler: (ref: { type: "folder" | "note", id: number }) => void }) => {
    useTreeRevealRequest(handler)
    return null
}

describe("tree-reveal", () => {
    it("dispatches a window event carrying the ref", () => {
        const listener = vi.fn()
        window.addEventListener(TREE_REVEAL_EVENT, listener)
        requestTreeReveal({ type: "note", id: 4 })
        window.removeEventListener(TREE_REVEAL_EVENT, listener)
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ type: "note", id: 4 })
    })

    it("calls the latest handler on a request", () => {
        const first = vi.fn()
        const second = vi.fn()
        const { rerender } = render(<Listener handler={first} />)
        rerender(<Listener handler={second} />)
        requestTreeReveal({ type: "folder", id: 2 })
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledWith({ type: "folder", id: 2 })
    })

    it("stops listening once unmounted", () => {
        const handler = vi.fn()
        const { unmount } = render(<Listener handler={handler} />)
        unmount()
        requestTreeReveal({ type: "note", id: 1 })
        expect(handler).not.toHaveBeenCalled()
    })
})
