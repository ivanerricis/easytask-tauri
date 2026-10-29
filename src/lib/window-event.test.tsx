import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { createWindowEvent } from "./window-event"

const ping = createWindowEvent<{ n: number }>("easytask:test-ping")
const Listener = ({ handler }: { handler: (detail: { n: number }) => void }) => {
    ping.useListen(handler)
    return null
}

describe("createWindowEvent", () => {
    it("emits a CustomEvent on window with the payload as detail", () => {
        const listener = vi.fn()
        window.addEventListener("easytask:test-ping", listener)
        ping.emit({ n: 1 })
        window.removeEventListener("easytask:test-ping", listener)
        expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ n: 1 })
    })

    it("runs the latest handler and stops listening on unmount", () => {
        const first = vi.fn()
        const second = vi.fn()
        const { rerender, unmount } = render(<Listener handler={first} />)
        rerender(<Listener handler={second} />)
        ping.emit({ n: 2 })
        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledWith({ n: 2 })
        unmount()
        ping.emit({ n: 3 })
        expect(second).toHaveBeenCalledTimes(1)
    })
})
