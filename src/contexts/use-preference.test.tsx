import { useEffect } from "react"
import { act, render, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { store } from "@/lib/store/initStore"
import { UI_PREFS } from "@/lib/store/preferences"
import { PreferencesProvider } from "./preferences-context"
import { usePreferences } from "./use-preferences"
import { usePreference } from "./use-preference"
import { useColorAlpha } from "./use-color-alpha"
import { useItemSize } from "@/pages/workspacePage/components/sidebar/item-size"

/** Mounts the provider with a hook that reads the whole context (to call the setters) and a counted consumer. */
const setup = <T,>(consumer: () => T) => {
    let renders = 0
    const all = renderHook(() => {
        renders++
        return consumer()
    }, { wrapper: ({ children }) => <PreferencesProvider><Actions />{children}</PreferencesProvider> })
    return { all, renders: () => renders }
}

const actions: { current: ReturnType<typeof usePreferences> } = { current: undefined as never }
function Actions() {
    const preferences = usePreferences()
    useEffect(() => { actions.current = preferences })
    return null
}

describe("usePreference", () => {
    it("reads a preference and follows its changes", async () => {
        const { all } = setup(() => usePreference(p => p.textZoom))
        expect(all.result.current).toBe(1)
        act(() => actions.current.setTextZoom(1.25))
        expect(all.result.current).toBe(1.25)
    })

    it("does not re-render a row that uses useItemSize when another preference changes", async () => {
        const { all, renders } = setup(() => useItemSize())
        await waitFor(() => expect(actions.current).toBeDefined())
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
        const before = renders()
        act(() => actions.current.setTextZoom(1.25))
        act(() => actions.current.setShowProgressBar(false))
        act(() => actions.current.setAudioPlayerPosition({ x: 10, y: 10, scaleX: 1, scaleY: 1 }))
        expect(renders()).toBe(before)
        const normal = all.result.current
        act(() => actions.current.setSidebarItemSize("large"))
        expect(renders()).toBe(before + 1)
        expect(all.result.current).not.toBe(normal)
    })

    it("does not re-render a useColorAlpha consumer while the audio player is dragged", async () => {
        const { all, renders } = setup(() => useColorAlpha())
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
        const before = renders()
        const alpha = all.result.current
        for (let x = 1; x <= 5; x++) act(() => actions.current.setAudioPlayerPosition({ x, y: x, scaleX: 1, scaleY: 1 }))
        act(() => actions.current.setTextZoom(1.5))
        expect(renders()).toBe(before)
        expect(all.result.current).toBe(alpha)
        act(() => actions.current.setColorIntensity(1.5))
        expect(renders()).toBe(before + 1)
        expect(all.result.current.item()).toBe(0.45)
    })

    it("applies the stored preferences with a single update", async () => {
        const stored: Record<string, unknown> = { colorIntensity: 1.4, audioVolume: 0.3, sidebarItemSize: "large", showProgressBar: false, undoLimit: 200 }
        for (const [name, value] of Object.entries(stored)) await store.set(UI_PREFS[name as keyof typeof UI_PREFS].key, value)
        let renders = 0
        const seen: string[] = []
        function Probe() {
            const key = [
                usePreference(p => p.colorIntensity), usePreference(p => p.audioVolume), usePreference(p => p.sidebarItemSize),
                usePreference(p => p.showProgressBar), usePreference(p => p.undoLimit),
            ].join("|")
            renders++
            seen.push(key)
            return null
        }
        render(<PreferencesProvider><Probe /></PreferencesProvider>)
        await waitFor(() => expect(seen.at(-1)).toBe("1.4|0.3|large|false|200"))
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
        // The defaults, then everything at once (no intermediate state with only some of the preferences)
        expect(renders).toBe(2)
        expect(seen).toHaveLength(2)
    })
})
