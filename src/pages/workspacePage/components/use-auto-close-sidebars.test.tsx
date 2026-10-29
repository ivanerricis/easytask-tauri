import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { IsSplitStoreContext } from "@/contexts/layout-context-object"
import { createExternalStore } from "@/lib/external-store"
import { useAutoCloseSidebars } from "./use-auto-close-sidebars"

const prefs = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock("@/contexts/use-preferences", () => ({ usePreferences: () => prefs.value }))

describe("useAutoCloseSidebars", () => {
    const original = window.innerWidth
    const setLeft = vi.fn()
    const setRight = vi.fn()
    const resizeTo = (width: number) => act(() => { window.innerWidth = width; window.dispatchEvent(new Event("resize")) })

    beforeEach(() => {
        setLeft.mockClear()
        setRight.mockClear()
        window.innerWidth = 1400
        prefs.value = {
            sidebarLeftOpen: true, sidebarLeftWidth: 480, setSideBarLeftOpen: setLeft,
            sidebarRightOpen: true, sidebarRightWidth: 480, setSideBarRightOpen: setRight,
        }
    })
    afterEach(() => { window.innerWidth = original })

    it("closes the right sidebar first when the window shrinks too much, the left one too if still needed", () => {
        renderHook(() => useAutoCloseSidebars())
        resizeTo(1000)
        expect(setRight).toHaveBeenCalledWith(false)
        expect(setLeft).not.toHaveBeenCalled()
        resizeTo(920)
        expect(setLeft).toHaveBeenCalledWith(false)
    })

    it("does nothing when the window grows back or when a sidebar is opened by hand", () => {
        window.innerWidth = 1000
        renderHook(() => useAutoCloseSidebars())
        // growing: no intervention even if the note stays narrow
        resizeTo(1010)
        // opening is just a preference change, there is no resize
        expect(setRight).not.toHaveBeenCalled()
        expect(setLeft).not.toHaveBeenCalled()
    })

    it("leaves compact windows (overlays) alone", () => {
        renderHook(() => useAutoCloseSidebars())
        resizeTo(600)
        expect(setRight).not.toHaveBeenCalled()
        expect(setLeft).not.toHaveBeenCalled()
    })

    describe("with the split workspace", () => {
        const splitStore = (value: boolean) => createExternalStore(value)
        const withStore = (store: ReturnType<typeof splitStore>) =>
            ({ children }: { children: ReactNode }) => <IsSplitStoreContext.Provider value={store}>{children}</IsSplitStoreContext.Provider>

        beforeEach(() => {
            window.innerWidth = 1000
            // 1000 - 90 rails - 2 * 224 leaves 462: enough for one pane (420) but not for two (640)
            prefs.value = { ...prefs.value, sidebarLeftWidth: 224, sidebarRightWidth: 224 }
        })

        it("closes the sidebars as needed when the workspace gets split, without any resize", () => {
            const store = splitStore(false)
            renderHook(() => useAutoCloseSidebars(), { wrapper: withStore(store) })
            expect(setRight).not.toHaveBeenCalled()
            act(() => store.set(true))
            expect(setRight).toHaveBeenCalledWith(false)
            expect(setLeft).not.toHaveBeenCalled()
        })

        it("does nothing when the workspace is not split, and does not loop", () => {
            const store = splitStore(false)
            const { rerender } = renderHook(() => useAutoCloseSidebars(), { wrapper: withStore(store) })
            rerender()
            rerender()
            expect(setRight).not.toHaveBeenCalled()
            expect(setLeft).not.toHaveBeenCalled()
            act(() => store.set(true))
            const calls = setRight.mock.calls.length + setLeft.mock.calls.length
            rerender()
            expect(setRight.mock.calls.length + setLeft.mock.calls.length).toBe(calls)
        })

        it("does not close anything when the split leaves enough room, nor on compact windows, nor when unsplitting", () => {
            const store = splitStore(false)
            window.innerWidth = 1400
            renderHook(() => useAutoCloseSidebars(), { wrapper: withStore(store) })
            act(() => store.set(true))
            expect(setRight).not.toHaveBeenCalled()
            window.innerWidth = 600
            act(() => store.set(false))
            act(() => store.set(true))
            expect(setRight).not.toHaveBeenCalled()
            expect(setLeft).not.toHaveBeenCalled()
        })
    })
})
