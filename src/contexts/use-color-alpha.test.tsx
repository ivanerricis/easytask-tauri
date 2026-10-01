import type { ReactNode } from "react"
import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useColorAlpha } from "./use-color-alpha"
import { PreferencesContext, type PreferencesContextType } from "./preferences-context-object"

const withIntensity = (colorIntensity: number) => ({ children }: { children: ReactNode }) => (
    <PreferencesContext.Provider value={{ colorIntensity } as PreferencesContextType}>{children}</PreferencesContext.Provider>
)

describe("useColorAlpha", () => {
    it("gives the default 100% alphas without a provider", () => {
        const { result } = renderHook(() => useColorAlpha())
        expect(result.current.intensity).toBe(1)
        expect(result.current.item()).toBe(0.3)
        expect(result.current.item(true)).toBe(0.5)
        expect(result.current.header()).toBe(0.4)
    })

    it("scales the alphas by the preference", () => {
        const { result } = renderHook(() => useColorAlpha(), { wrapper: withIntensity(1.5) })
        expect(result.current.item()).toBe(0.45)
        expect(result.current.item(true)).toBe(0.75)
        expect(result.current.header()).toBe(0.6)
    })

    it("limits the alphas", () => {
        const { result } = renderHook(() => useColorAlpha(), { wrapper: withIntensity(1.75) })
        expect(result.current.item(true)).toBe(0.85)
    })
})
