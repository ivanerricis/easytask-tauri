import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PreferencesProvider, usePreferences } from "./preferences-context"
import * as prefs from "@/lib/store/preferences"

vi.mock("@/lib/store/initStore", () => ({ store: {} }))
vi.mock("@/lib/store/preferences", () => ({
    getPrimaryColor: vi.fn(),
    savePrimaryColor: vi.fn(),
    getShowProgressBar: vi.fn(),
    saveShowProgressBar: vi.fn(),
    getShowSectionCount: vi.fn(),
    saveShowSectionCount: vi.fn(),
    getShowTaskCount: vi.fn(),
    saveShowTaskCount: vi.fn(),
    getSideBarLeftOpen: vi.fn(),
    saveSideBarLeftOpen: vi.fn(),
    getSideBarRightOpen: vi.fn(),
    saveSideBarRightOpen: vi.fn(),
    getAudioPlayerPosition: vi.fn(),
    saveAudioPlayerPosition: vi.fn(),
    resetAudioPlayerPosition: vi.fn(),
    getWorkspaceView: vi.fn(),
    saveWorkspaceView: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>

describe("PreferencesContext", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        document.documentElement.style.removeProperty("--primary")
        vi.mocked(prefs.getPrimaryColor).mockResolvedValue("#123456")
        vi.mocked(prefs.getShowProgressBar).mockResolvedValue(false)
        vi.mocked(prefs.getShowSectionCount).mockResolvedValue(true)
        vi.mocked(prefs.getShowTaskCount).mockResolvedValue(false)
        vi.mocked(prefs.getSideBarLeftOpen).mockResolvedValue(false)
        vi.mocked(prefs.getSideBarRightOpen).mockResolvedValue(true)
        vi.mocked(prefs.getWorkspaceView).mockResolvedValue("list")
        vi.mocked(prefs.getAudioPlayerPosition).mockResolvedValue({ x: 5, y: 6, scaleX: 2, scaleY: 2 })
    })

    it("throws when used outside the provider", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {})
        expect(() => renderHook(() => usePreferences())).toThrow(/PreferencesProvider/)
        spy.mockRestore()
    })

    it("has defaults before the store answers", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.primaryColor).toBe("#ffb375")
        expect(result.current.showProgressBar).toBe(true)
        expect(result.current.workspaceView).toBe("grid")
        await waitFor(() => expect(result.current.primaryColor).toBe("#123456"))
    })

    it("loads persisted values and applies the primary color to the document", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })

        await waitFor(() => expect(result.current.primaryColor).toBe("#123456"))
        expect(result.current.showProgressBar).toBe(false)
        expect(result.current.showTaskCount).toBe(false)
        expect(result.current.sidebarLeftOpen).toBe(false)
        expect(result.current.workspaceView).toBe("list")
        expect(result.current.audioPlayerPosition).toEqual({ x: 5, y: 6, scaleX: 2, scaleY: 2 })
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#123456")
    })

    it("updates state and persists when a setter is called", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        await waitFor(() => expect(result.current.primaryColor).toBe("#123456"))

        act(() => {
            result.current.setShowProgressBar(true)
            result.current.setSideBarLeftOpen(true)
            result.current.setPrimaryColor("#abcdef")
            result.current.setWorkspaceView("grid")
        })

        expect(result.current.showProgressBar).toBe(true)
        expect(result.current.sidebarLeftOpen).toBe(true)
        expect(result.current.primaryColor).toBe("#abcdef")
        expect(prefs.saveShowProgressBar).toHaveBeenCalledWith(true)
        expect(prefs.saveSideBarLeftOpen).toHaveBeenCalledWith(true)
        expect(prefs.savePrimaryColor).toHaveBeenCalledWith("#abcdef")
        expect(result.current.workspaceView).toBe("grid")
        expect(prefs.saveWorkspaceView).toHaveBeenCalledWith("grid")
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#abcdef")
    })

    it("resetPlayerPosition resets the store but skips the state update without a container", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        await waitFor(() => expect(result.current.audioPlayerPosition.x).toBe(5))

        act(() => result.current.resetPlayerPosition())

        expect(prefs.resetAudioPlayerPosition).toHaveBeenCalled()
        expect(prefs.saveAudioPlayerPosition).not.toHaveBeenCalled()
        expect(result.current.audioPlayerPosition.x).toBe(5)
    })

    it("resetPlayerPosition centers the player at the bottom of the container", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        await waitFor(() => expect(result.current.audioPlayerPosition.x).toBe(5))

        const el = document.createElement("div")
        Object.defineProperty(el, "offsetWidth", { value: 1000 })
        Object.defineProperty(el, "offsetHeight", { value: 600 })
        result.current.audioPlayerContainerRef.current = el

        act(() => result.current.resetPlayerPosition())

        const expected = { x: 500 - 175, y: 600 - 82, scaleX: 1, scaleY: 1 }
        expect(result.current.audioPlayerPosition).toEqual(expected)
        expect(prefs.saveAudioPlayerPosition).toHaveBeenCalledWith(expected)
    })
})
