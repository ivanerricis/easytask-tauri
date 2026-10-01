import { useEffect } from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabs, useTabsActions } from "@/contexts/use-tabs"
import { NoteHeader } from "@/pages/workspacePage/components/note/NoteHeader"
import { useTabShortcuts } from "./use-tab-shortcuts"
import { makeNote } from "@/test/ui-fixtures"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"

vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn().mockResolvedValue(false) }))
vi.mock("@/pages/workspacePage/components/note/ButtonMenuNote", () => ({ ButtonMenuNote: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))

const notes = [1, 2, 3].map(id => makeNote({ id, name: `Nota ${id}` }))

type Api = ReturnType<typeof useTabs> & ReturnType<typeof useTabsActions>

function Host({ withShortcuts, onRender }: { withShortcuts: boolean, onRender: (api: Api) => void }) {
    const api = { ...useTabs(), ...useTabsActions() }
    useEffect(() => onRender(api))
    return (
        <>
            {withShortcuts && <Shortcuts />}
            {api.tabs.map(note => <NoteHeader key={note.id} note={note} />)}
        </>
    )
}

function Shortcuts() {
    useTabShortcuts()
    return null
}

const keydownRegistrations = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([type]) => type === "keydown").length

describe("useTabShortcuts", () => {
    afterEach(() => vi.restoreAllMocks())

    const setup = (withShortcuts = true) => {
        const latest: { current: Api } = { current: undefined as never }
        const view = render(
            <ShortcutsProvider><TabsProvider notes={notes} workspaceId={null}>
                <Host withShortcuts={withShortcuts} onRender={api => { latest.current = api }} />
            </TabsProvider></ShortcutsProvider>
        )
        act(() => { latest.current.openNote(1); latest.current.openNote(2); latest.current.openNote(3) })
        return { latest, view }
    }

    it("registers one keydown listener (the provider's) no matter how many tabs are open", () => {
        const spy = vi.spyOn(window, "addEventListener")
        const { latest } = setup()

        expect(latest.current.tabs).toHaveLength(3)
        expect(keydownRegistrations(spy)).toBe(1)
    })

    it("the tab headers add no global listener beyond the provider one", () => {
        const spy = vi.spyOn(window, "addEventListener")
        setup(false)
        expect(keydownRegistrations(spy)).toBe(1)
    })

    it("removes the listener on unmount", () => {
        const spy = vi.spyOn(window, "removeEventListener")
        const { view } = setup()
        view.unmount()
        expect(keydownRegistrations(spy)).toBe(1)
    })

    it("Ctrl+L closes only the active tab, selecting the neighbour", () => {
        const { latest } = setup()
        act(() => latest.current.activateNote(2))

        fireEvent.keyDown(document, { key: "l", ctrlKey: true })

        expect(latest.current.openIds).toEqual([1, 3])
        expect(latest.current.activeId).toBe(3)
    })

    it("Ctrl+T closes every tab", () => {
        const { latest } = setup()
        fireEvent.keyDown(document, { key: "t", ctrlKey: true })
        expect(latest.current.openIds).toEqual([])
        expect(latest.current.activeId).toBeNull()
    })

    it("ignores the keys without Ctrl/Cmd and other shortcuts", () => {
        const { latest } = setup()
        fireEvent.keyDown(document, { key: "l" })
        fireEvent.keyDown(document, { key: "t" })
        fireEvent.keyDown(document, { key: "o", ctrlKey: true })
        expect(latest.current.openIds).toEqual([1, 2, 3])
    })
})
