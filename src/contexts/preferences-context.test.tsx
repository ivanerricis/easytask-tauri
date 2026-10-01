import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PreferencesProvider } from "./preferences-context"
import { usePreferences } from "./use-preferences"
import * as prefs from "@/lib/store/preferences"

vi.mock("@/lib/store/initStore", () => ({ store: {} }))
vi.mock("@/lib/store/preferences", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/store/preferences")>()),
    getAudioVolume: vi.fn(),
    saveAudioVolume: vi.fn(),
    getAudioPlayerVisible: vi.fn(),
    saveAudioPlayerVisible: vi.fn(),
    getAudioPlayerScale: vi.fn(),
    saveAudioPlayerScale: vi.fn(),
    getAudioPlayerOpacity: vi.fn(),
    saveAudioPlayerOpacity: vi.fn(),
    getPrimaryColor: vi.fn(),
    savePrimaryColor: vi.fn(),
    getShowProgressBar: vi.fn(),
    saveShowProgressBar: vi.fn(),
    getShowGroupProgressBar: vi.fn(),
    saveShowGroupProgressBar: vi.fn(),
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
    getReopenNotes: vi.fn(),
    saveReopenNotes: vi.fn(),
    getReopenLastWorkspace: vi.fn(),
    saveReopenLastWorkspace: vi.fn(),
    getSidebarItemSize: vi.fn(),
    saveSidebarItemSize: vi.fn(),
    getSidebarLeftWidth: vi.fn(),
    saveSidebarLeftWidth: vi.fn(),
    getSidebarRightWidth: vi.fn(),
    saveSidebarRightWidth: vi.fn(),
    getRightPanelTab: vi.fn(),
    saveRightPanelTab: vi.fn(),
    getLanguage: vi.fn(),
    saveLanguage: vi.fn(),
}))

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>

describe("PreferencesContext", () => {
    beforeEach(() => {
        vi.resetAllMocks()
        document.documentElement.style.removeProperty("--primary")
        vi.mocked(prefs.getPrimaryColor).mockResolvedValue("#123456")
        vi.mocked(prefs.getShowProgressBar).mockResolvedValue(false)
        vi.mocked(prefs.getShowGroupProgressBar).mockResolvedValue(false)
        vi.mocked(prefs.getShowSectionCount).mockResolvedValue(true)
        vi.mocked(prefs.getShowTaskCount).mockResolvedValue(false)
        vi.mocked(prefs.getSideBarLeftOpen).mockResolvedValue(false)
        vi.mocked(prefs.getSideBarRightOpen).mockResolvedValue(true)
        vi.mocked(prefs.getWorkspaceView).mockResolvedValue("list")
        vi.mocked(prefs.getReopenNotes).mockResolvedValue(false)
        vi.mocked(prefs.getReopenLastWorkspace).mockResolvedValue(true)
        vi.mocked(prefs.getSidebarItemSize).mockResolvedValue("large")
        vi.mocked(prefs.getSidebarLeftWidth).mockResolvedValue(320)
        vi.mocked(prefs.getSidebarRightWidth).mockResolvedValue(300)
        vi.mocked(prefs.getRightPanelTab).mockResolvedValue("history")
        vi.mocked(prefs.getLanguage).mockResolvedValue("system")
        vi.mocked(prefs.getAudioVolume).mockResolvedValue(0.3)
        vi.mocked(prefs.getAudioPlayerVisible).mockResolvedValue(false)
        vi.mocked(prefs.getAudioPlayerScale).mockResolvedValue(1.2)
        vi.mocked(prefs.getAudioPlayerOpacity).mockResolvedValue(0.6)
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
        expect(result.current.showGroupProgressBar).toBe(true)
        expect(result.current.workspaceView).toBe("grid")
        await waitFor(() => expect(result.current.primaryColor).toBe("#123456"))
    })

    it("loads persisted values and applies the primary color to the document", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })

        await waitFor(() => expect(result.current.primaryColor).toBe("#123456"))
        expect(result.current.showProgressBar).toBe(false)
        expect(result.current.showGroupProgressBar).toBe(false)
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
            result.current.setShowGroupProgressBar(true)
            result.current.setSideBarLeftOpen(true)
            result.current.setPrimaryColor("#abcdef")
            result.current.setWorkspaceView("grid")
        })

        expect(result.current.showProgressBar).toBe(true)
        expect(result.current.sidebarLeftOpen).toBe(true)
        expect(result.current.primaryColor).toBe("#abcdef")
        expect(prefs.saveShowProgressBar).toHaveBeenCalledWith(true)
        expect(result.current.showGroupProgressBar).toBe(true)
        expect(prefs.saveShowGroupProgressBar).toHaveBeenCalledWith(true)
        expect(prefs.saveSideBarLeftOpen).toHaveBeenCalledWith(true)
        expect(prefs.savePrimaryColor).toHaveBeenCalledWith("#abcdef")
        expect(result.current.workspaceView).toBe("grid")
        expect(prefs.saveWorkspaceView).toHaveBeenCalledWith("grid")
        expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#abcdef")
    })

    it("has backwards compatible audio defaults, then loads the stored ones", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.audioVolume).toBe(1)
        expect(result.current.audioPlayerVisible).toBe(true)
        expect(result.current.audioPlayerScale).toBe(1)
        expect(result.current.audioPlayerOpacity).toBe(1)
        await waitFor(() => expect(result.current.audioVolume).toBe(0.3))
        expect(result.current.audioPlayerVisible).toBe(false)
        expect(result.current.audioPlayerScale).toBe(1.2)
        expect(result.current.audioPlayerOpacity).toBe(0.6)
    })

    it("updates and persists the audio preferences (clamped) and can reset them", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        await waitFor(() => expect(result.current.audioVolume).toBe(0.3))

        act(() => {
            result.current.setAudioVolume(5)
            result.current.setAudioPlayerOpacity(0.1)
            result.current.setAudioPlayerScale(0.85)
            result.current.setAudioPlayerVisible(true)
        })
        expect(result.current.audioVolume).toBe(1)
        expect(prefs.saveAudioVolume).toHaveBeenCalledWith(1)
        expect(result.current.audioPlayerOpacity).toBe(0.4)
        expect(prefs.saveAudioPlayerOpacity).toHaveBeenCalledWith(0.4)
        expect(result.current.audioPlayerScale).toBe(0.85)
        expect(prefs.saveAudioPlayerScale).toHaveBeenCalledWith(0.85)
        expect(prefs.saveAudioPlayerVisible).toHaveBeenCalledWith(true)

        act(() => result.current.setAudioVolume(0.2))
        act(() => result.current.resetAudioSettings())
        expect(result.current.audioVolume).toBe(1)
        expect(result.current.audioPlayerScale).toBe(1)
        expect(result.current.audioPlayerOpacity).toBe(1)
        expect(result.current.audioPlayerVisible).toBe(true)
    })

    it("pulls the player back inside the container when it gets bigger", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        await waitFor(() => expect(result.current.audioPlayerScale).toBe(1.2))
        const container = document.createElement("div")
        Object.defineProperty(container, "offsetWidth", { value: 600 })
        Object.defineProperty(container, "offsetHeight", { value: 400 })
        result.current.audioPlayerContainerRef.current = container
        act(() => result.current.setAudioPlayerPosition({ x: 250, y: 318, scaleX: 1, scaleY: 1 }))
        act(() => result.current.setAudioPlayerScale(1.2))
        expect(result.current.audioPlayerPosition.x).toBe(180)
        expect(result.current.audioPlayerPosition.y).toBeCloseTo(301.6)
    })

    it("loads and persists the reopen notes preference (default on)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.reopenNotes).toBe(true)
        await waitFor(() => expect(result.current.reopenNotes).toBe(false))

        act(() => result.current.setReopenNotes(true))

        expect(result.current.reopenNotes).toBe(true)
        expect(prefs.saveReopenNotes).toHaveBeenCalledWith(true)
    })

    it("loads and persists the reopen last workspace preference (default off)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.reopenLastWorkspace).toBe(false)
        await waitFor(() => expect(result.current.reopenLastWorkspace).toBe(true))

        act(() => result.current.setReopenLastWorkspace(false))

        expect(result.current.reopenLastWorkspace).toBe(false)
        expect(prefs.saveReopenLastWorkspace).toHaveBeenCalledWith(false)
    })

    it("loads and persists the sidebar item size (default normal)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.sidebarItemSize).toBe("normal")
        await waitFor(() => expect(result.current.sidebarItemSize).toBe("large"))

        act(() => result.current.setSidebarItemSize("compact"))

        expect(result.current.sidebarItemSize).toBe("compact")
        expect(prefs.saveSidebarItemSize).toHaveBeenCalledWith("compact")
    })

    it("loads and persists the left sidebar width (default 260, clamped on save)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.sidebarLeftWidth).toBe(260)
        await waitFor(() => expect(result.current.sidebarLeftWidth).toBe(320))

        act(() => result.current.setSidebarLeftWidth(400))
        expect(result.current.sidebarLeftWidth).toBe(400)
        expect(prefs.saveSidebarLeftWidth).toHaveBeenCalledWith(400)

        act(() => result.current.setSidebarLeftWidth(5000))
        expect(result.current.sidebarLeftWidth).toBe(480)
    })

    it("loads and persists the right sidebar width (default 260, clamped on save)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.sidebarRightWidth).toBe(260)
        await waitFor(() => expect(result.current.sidebarRightWidth).toBe(300))

        act(() => result.current.setSidebarRightWidth(380))
        expect(result.current.sidebarRightWidth).toBe(380)
        expect(prefs.saveSidebarRightWidth).toHaveBeenCalledWith(380)

        act(() => result.current.setSidebarRightWidth(5000))
        expect(result.current.sidebarRightWidth).toBe(480)
    })

    it("loads and persists the right panel tab (details by default)", async () => {
        const { result } = renderHook(() => usePreferences(), { wrapper })
        expect(result.current.rightPanelTab).toBe("details")
        await waitFor(() => expect(result.current.rightPanelTab).toBe("history"))

        act(() => result.current.setRightPanelTab("details"))
        expect(result.current.rightPanelTab).toBe("details")
        expect(prefs.saveRightPanelTab).toHaveBeenCalledWith("details")
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
        // The stored size is 1.2: the player is taller and wider, so it is placed accordingly
        await waitFor(() => expect(result.current.audioPlayerScale).toBe(1.2))

        const el = document.createElement("div")
        Object.defineProperty(el, "offsetWidth", { value: 1000 })
        Object.defineProperty(el, "offsetHeight", { value: 600 })
        result.current.audioPlayerContainerRef.current = el

        act(() => result.current.resetPlayerPosition())

        const expected = { x: 500 - 175 * 1.2, y: 600 - 82 * 1.2, scaleX: 1, scaleY: 1 }
        expect(result.current.audioPlayerPosition).toEqual(expected)
        expect(prefs.saveAudioPlayerPosition).toHaveBeenCalledWith(expected)
    })
})
