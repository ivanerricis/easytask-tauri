import { useEffect, type ReactNode } from "react"
import { fireEvent, render, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { useShortcutsContext } from "@/contexts/use-shortcuts"
import { store } from "@/lib/store/initStore"
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
})
