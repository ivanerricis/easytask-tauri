import { createContext } from "react"
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { createRequiredContextHook } from "./required-context"

describe("createRequiredContextHook", () => {
    it("returns the value of the context", () => {
        const Ctx = createContext<{ a: number } | null>(null)
        const useX = createRequiredContextHook(Ctx, "useX", "XProvider")
        const { result } = renderHook(() => useX(), { wrapper: ({ children }) => <Ctx.Provider value={{ a: 1 }}>{children}</Ctx.Provider> })
        expect(result.current).toEqual({ a: 1 })
    })

    it("throws a message with 'a' or 'an' by the first letter of the provider", () => {
        const Ctx = createContext<object | null>(null)
        vi.spyOn(console, "error").mockImplementation(() => {})
        expect(() => renderHook(() => createRequiredContextHook(Ctx, "useX", "TabsProvider")())).toThrow("useX must be used within a TabsProvider")
        expect(() => renderHook(() => createRequiredContextHook(Ctx, "useY", "AudioProvider")())).toThrow("useY must be used within an AudioProvider")
    })
})
