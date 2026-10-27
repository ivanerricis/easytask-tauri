import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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
})
