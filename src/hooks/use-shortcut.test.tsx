import { useEffect, type ReactNode } from "react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { useShortcutsContext } from "@/contexts/use-shortcuts"
import { store } from "@/lib/store/initStore"
import { PaneContext } from "@/contexts/layout-context-object"
import { useShortcut } from "./use-shortcut"

type Options = Parameters<typeof useShortcut>[2]

function Probe({ id, handler, options }: { id: string, handler: () => void, options?: Options }) {
    useShortcut(id, handler, options)
    return <input aria-label="campo" />
}

const holder: { ctx?: ReturnType<typeof useShortcutsContext> } = {}
const ctx = () => holder.ctx!
function Ctx() {
    const context = useShortcutsContext()
    useEffect(() => { holder.ctx = context })
    return null
}

const setup = (ui: ReactNode) => render(<ShortcutsProvider><Ctx />{ui}</ShortcutsProvider>)

describe("useShortcut", () => {
    it("fires the handler on the default binding and prevents the default action", () => {
        const handler = vi.fn()
        setup(<Probe id="close-note" handler={handler} />)
        const notPrevented = fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
        expect(notPrevented).toBe(false)
        fireEvent.keyDown(document.body, { key: "l" })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("ignores corrupted stored overrides: the defaults keep working for every shortcut", async () => {
        await store.set("shortcutOverrides", { "close-note": { key: 5 }, "close-all-notes": null, ghost: { key: "x" } })
        const closeNote = vi.fn()
        const closeAll = vi.fn()
        setup(<><Probe id="close-note" handler={closeNote} /><Probe id="close-all-notes" handler={closeAll} /></>)
        await waitFor(() => expect(store.get).toBeDefined())
        await new Promise(resolve => setTimeout(resolve, 0))
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        fireEvent.keyDown(document.body, { key: "t", ctrlKey: true })
        expect(closeNote).toHaveBeenCalledTimes(1)
        expect(closeAll).toHaveBeenCalledTimes(1)
    })

    it("ignores events from inputs unless allowInInputs is set", () => {
        const blocked = vi.fn()
        const allowed = vi.fn()
        const { getAllByLabelText } = setup(<>
            <Probe id="close-note" handler={blocked} />
            <Probe id="close-all-notes" handler={allowed} options={{ allowInInputs: true }} />
        </>)
        const input = getAllByLabelText("campo")[0]
        fireEvent.keyDown(input, { key: "l", ctrlKey: true })
        fireEvent.keyDown(input, { key: "t", ctrlKey: true })
        expect(blocked).not.toHaveBeenCalled()
        expect(allowed).toHaveBeenCalledTimes(1)
    })

    it("does nothing when disabled and uses the latest handler", () => {
        const first = vi.fn()
        const second = vi.fn()
        const view = setup(<Probe id="close-note" handler={first} options={{ enabled: false }} />)
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(first).not.toHaveBeenCalled()
        view.rerender(<ShortcutsProvider><Ctx /><Probe id="close-note" handler={second} /></ShortcutsProvider>)
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(second).toHaveBeenCalledTimes(1)
    })

    it("follows overrides (also the saved ones) instead of the default", async () => {
        await store.set("shortcutOverrides", { "close-note": { key: "k", alt: true } })
        const handler = vi.fn()
        setup(<Probe id="close-note" handler={handler} />)
        await waitFor(() => expect(ctx().getBinding("close-note")).toEqual({ key: "k", alt: true }))
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(handler).not.toHaveBeenCalled()
        fireEvent.keyDown(document.body, { key: "k", altKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("is paused while recording", () => {
        const handler = vi.fn()
        setup(<Probe id="close-note" handler={handler} />)
        ctx().setRecording(true)
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(handler).not.toHaveBeenCalled()
        ctx().setRecording(false)
        fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
        expect(handler).toHaveBeenCalledTimes(1)
    })

    describe("in two panes", () => {
        const Pane = ({ pane, focus, children }: { pane: 0 | 1, focus: { current: 0 | 1 }, children: ReactNode }) => (
            <PaneContext.Provider value={{ pane, focused: focus.current === pane, isFocused: () => focus.current === pane, rootRef: { current: null } }}>
                {children}
            </PaneContext.Provider>
        )

        it("runs only the handler of the focused pane, following the focus without re-registering, and always the global one", () => {
            const focus: { current: 0 | 1 } = { current: 0 }
            const left = vi.fn()
            const right = vi.fn()
            const global = vi.fn()
            setup(<>
                <Pane pane={0} focus={focus}><Probe id="close-note" handler={left} /></Pane>
                <Pane pane={1} focus={focus}><Probe id="close-note" handler={right} /></Pane>
                <Probe id="close-note" handler={global} />
            </>)
            fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
            expect([left.mock.calls.length, right.mock.calls.length, global.mock.calls.length]).toEqual([1, 0, 1])
            focus.current = 1
            fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
            expect([left.mock.calls.length, right.mock.calls.length, global.mock.calls.length]).toEqual([1, 1, 2])
        })

        it("does not prevent the default action when the only handler sits in a pane without the focus", () => {
            const focus: { current: 0 | 1 } = { current: 1 }
            const handler = vi.fn()
            setup(<Pane pane={0} focus={focus}><Probe id="close-note" handler={handler} /></Pane>)
            const notPrevented = fireEvent.keyDown(document.body, { key: "l", ctrlKey: true })
            expect(handler).not.toHaveBeenCalled()
            expect(notPrevented).toBe(true)
        })

        it("trigger (the app menu) runs only the focused pane's handler", () => {
            const focus: { current: 0 | 1 } = { current: 1 }
            const left = vi.fn()
            const right = vi.fn()
            setup(<>
                <Pane pane={0} focus={focus}><Probe id="close-note" handler={left} /></Pane>
                <Pane pane={1} focus={focus}><Probe id="close-note" handler={right} /></Pane>
            </>)
            expect(ctx().trigger("close-note")).toBe(true)
            expect([left.mock.calls.length, right.mock.calls.length]).toEqual([0, 1])
        })
    })
})
