import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useGrabbingCursor } from "./use-grabbing-cursor"

const cursorStyles = () => [...document.head.querySelectorAll("style")].filter(style => style.textContent?.startsWith("*, *::before"))
const cursorStyle = () => cursorStyles()[0]?.textContent ?? ""

describe("useGrabbingCursor", () => {
    it("adds nothing while nothing is dragged", () => {
        renderHook(() => useGrabbingCursor(false))
        expect(cursorStyle()).toBe("")
    })

    it("shows the closed hand while dragging and removes the style at the end", () => {
        const { unmount } = renderHook(() => useGrabbingCursor(true))
        expect(cursorStyle()).toContain("cursor: grabbing")
        unmount()
        expect(cursorStyle()).toBe("")
    })

    it("shows the not allowed cursor over an invalid target and goes back to the hand", () => {
        const { rerender } = renderHook(({ notAllowed }) => useGrabbingCursor(true, notAllowed), { initialProps: { notAllowed: true } })
        expect(cursorStyle()).toContain("cursor: not-allowed")
        expect(cursorStyles()).toHaveLength(1)
        rerender({ notAllowed: false })
        expect(cursorStyle()).toContain("cursor: grabbing")
        expect(cursorStyles()).toHaveLength(1)
    })

    it("shows nothing special for an invalid target when nothing is dragged", () => {
        renderHook(() => useGrabbingCursor(false, true))
        expect(cursorStyle()).toBe("")
    })
})
