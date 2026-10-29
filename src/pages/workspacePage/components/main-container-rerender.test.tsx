import { act, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ShortcutsProvider } from "@/contexts/shortcuts-context"
import { TabsProvider } from "@/contexts/tabs-context"
import { useTabsActions } from "@/contexts/use-tabs"
import { useLayoutActions } from "@/contexts/use-layout"
import { useTabShortcuts } from "@/hooks/use-tab-shortcuts"
import { makeNote } from "@/test/ui-fixtures"
import { useAutoCloseSidebars } from "./use-auto-close-sidebars"

vi.mock("@/lib/store/preferences", () => ({ getReopenNotes: vi.fn().mockResolvedValue(false) }))
vi.mock("@/lib/store/tabs", () => ({ getWorkspaceTabs: vi.fn(), saveWorkspaceTabs: vi.fn() }))
vi.mock("@/contexts/use-preferences", () => ({
    usePreferences: () => ({
        sidebarLeftOpen: false, sidebarLeftWidth: 260, setSideBarLeftOpen: vi.fn(),
        sidebarRightOpen: false, sidebarRightWidth: 260, setSideBarRightOpen: vi.fn(),
    }),
}))

const notes = [1, 2, 3].map(id => makeNote({ id, name: `Nota ${id}` }))

describe("hooks of MainContainer", () => {
    it("do not re-render on a tab switch inside a single pane, but only when the split flips", () => {
        let renders = 0
        const api: { tabs: ReturnType<typeof useTabsActions>, layout: ReturnType<typeof useLayoutActions> } = { tabs: undefined as never, layout: undefined as never }
        function Probe() {
            useTabShortcuts()
            useAutoCloseSidebars()
            api.tabs = useTabsActions()
            api.layout = useLayoutActions()
            renders++
            return null
        }
        render(<ShortcutsProvider><TabsProvider notes={notes} workspaceId={null}><Probe /></TabsProvider></ShortcutsProvider>)
        act(() => { api.tabs.openNote(1); api.tabs.openNote(2); api.tabs.openNote(3) })
        const before = renders
        act(() => api.tabs.activateNote(1))
        act(() => api.tabs.activateNote(2))
        act(() => api.tabs.cycleNote(1))
        act(() => api.tabs.closeNote(3))
        expect(renders).toBe(before)

        act(() => api.layout.split())
        expect(renders).toBe(before + 1)
        act(() => api.layout.focusPane(0))
        expect(renders).toBe(before + 1)
    })
})
