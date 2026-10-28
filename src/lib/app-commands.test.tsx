import { act, render, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { PaneContext } from "@/contexts/layout-context-object"
import { requestAppCommand, useAppCommand, useIsAppCommandActive } from "./app-commands"

const Pane = ({ pane, focus, children }: { pane: 0 | 1, focus: { current: 0 | 1 }, children: ReactNode }) => (
    <PaneContext.Provider value={{ pane, focused: focus.current === pane, isFocused: () => focus.current === pane, rootRef: { current: null } }}>
        {children}
    </PaneContext.Provider>
)

function Handler({ handler, enabled }: { handler: () => void, enabled?: boolean }) {
    useAppCommand("new-group", handler, { enabled })
    return null
}

describe("useAppCommand", () => {
    it("runs the handler outside the panes and counts as active only while mounted and enabled", () => {
        const handler = vi.fn()
        const active = renderHook(() => useIsAppCommandActive("new-group"))
        expect(active.result.current).toBe(false)
        const view = render(<Handler handler={handler} />)
        expect(active.result.current).toBe(true)
        act(() => requestAppCommand("new-group"))
        expect(handler).toHaveBeenCalledTimes(1)
        view.rerender(<Handler handler={handler} enabled={false} />)
        expect(active.result.current).toBe(false)
        view.unmount()
    })

    it("with two panes only the handler of the focused one runs, and both count as active", () => {
        const focus: { current: 0 | 1 } = { current: 0 }
        const left = vi.fn()
        const right = vi.fn()
        const active = renderHook(() => useIsAppCommandActive("new-group"))
        const view = render(<>
            <Pane pane={0} focus={focus}><Handler handler={left} /></Pane>
            <Pane pane={1} focus={focus}><Handler handler={right} /></Pane>
        </>)
        act(() => requestAppCommand("new-group"))
        expect([left.mock.calls.length, right.mock.calls.length]).toEqual([1, 0])
        focus.current = 1
        act(() => requestAppCommand("new-group"))
        expect([left.mock.calls.length, right.mock.calls.length]).toEqual([1, 1])
        // A handler in a pane without the focus keeps the menu entry enabled
        view.rerender(<Pane pane={0} focus={focus}><Handler handler={left} /></Pane>)
        expect(active.result.current).toBe(true)
        view.unmount()
        expect(active.result.current).toBe(false)
    })
})
