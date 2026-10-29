import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { initialTabsState } from "@/lib/tabs/tabs-reducer"
import { useIsFocusedPane, useLayout, useLayoutActions, usePane, usePaneFocusGetter, usePaneOfNote, usePaneRoot } from "./use-layout"

describe("use-layout fuori dai provider", () => {
    it("useLayout restituisce una sola area vuota", () => {
        const { result } = renderHook(() => useLayout())
        expect(result.current).toEqual({ left: initialTabsState, right: null, focused: 0, isSplit: false })
    })

    it("useLayoutActions restituisce azioni che non fanno nulla", () => {
        const { result } = renderHook(() => useLayoutActions())
        expect(() => {
            result.current.split()
            result.current.unsplit()
            result.current.toggleSplit()
            result.current.focusPane(1)
            result.current.openInPane(1, 1)
            result.current.moveToPane(1, 1, 0)
        }).not.toThrow()
    })

    it("usePane è null e l'area risulta sempre focalizzata", () => {
        expect(renderHook(() => usePane()).result.current).toBeNull()
        expect(renderHook(() => useIsFocusedPane()).result.current).toBe(true)
    })

    it("usePaneFocusGetter ha identità stabile e restituisce true", () => {
        const { result, rerender } = renderHook(() => usePaneFocusGetter())
        const first = result.current
        rerender()
        expect(result.current).toBe(first)
        expect(first()).toBe(true)
    })

    it("usePaneOfNote è null per una nota non aperta", () => {
        expect(renderHook(() => usePaneOfNote(1)).result.current).toBeNull()
    })

    it("usePaneRoot restituisce document, con identità stabile", () => {
        const { result, rerender } = renderHook(() => usePaneRoot())
        const first = result.current
        rerender()
        expect(result.current).toBe(first)
        expect(first()).toBe(document)
    })
})
