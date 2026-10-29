import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PaneDivider } from "./PaneDivider"

const setup = (ratio = 0.5, width = 1000) => {
    const container = document.createElement("div")
    container.getBoundingClientRect = () => ({ left: 100, width, right: 100 + width, top: 0, bottom: 0, height: 0, x: 100, y: 0, toJSON: () => ({}) })
    const containerRef = createRef<HTMLElement>() as { current: HTMLElement | null }
    containerRef.current = container
    const onRatioChange = vi.fn()
    const onRatioCommit = vi.fn()
    render(<PaneDivider ratio={ratio} containerRef={containerRef} containerWidth={width} onRatioChange={onRatioChange} onRatioCommit={onRatioCommit} />)
    return { separator: screen.getByRole("separator"), onRatioChange, onRatioCommit }
}

describe("PaneDivider", () => {
    beforeEach(() => {
        Element.prototype.setPointerCapture = vi.fn()
    })

    it("is a focusable vertical separator exposing the ratio", () => {
        const { separator } = setup(0.4)
        expect(separator).toHaveAttribute("aria-orientation", "vertical")
        expect(separator).toHaveAttribute("tabindex", "0")
        expect(separator).toHaveAttribute("aria-label", "Ridimensiona le due aree")
        expect(separator).toHaveAttribute("aria-valuenow", "40")
        expect(separator).toHaveAttribute("aria-valuemin", "32")
        expect(separator).toHaveAttribute("aria-valuemax", "68")
        expect(separator).toHaveAttribute("aria-valuetext", "40% a sinistra")
    })

    it("follows the pointer while dragging and commits once on release", () => {
        const { separator, onRatioChange, onRatioCommit } = setup()
        fireEvent.pointerDown(separator, { button: 0, clientX: 600, pointerId: 1 })
        fireEvent.pointerMove(separator, { clientX: 450, pointerId: 1 })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.35)
        fireEvent.pointerMove(separator, { clientX: 120, pointerId: 1 })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.32)
        expect(onRatioCommit).not.toHaveBeenCalled()
        fireEvent.pointerUp(separator, { pointerId: 1 })
        expect(onRatioCommit).toHaveBeenCalledWith(0.32)
        fireEvent.pointerMove(separator, { clientX: 500, pointerId: 1 })
        expect(onRatioChange).toHaveBeenCalledTimes(2)
    })

    it("ignores moves without a press and presses of other buttons", () => {
        const { separator, onRatioChange, onRatioCommit } = setup()
        fireEvent.pointerMove(separator, { clientX: 450 })
        fireEvent.pointerDown(separator, { button: 2, clientX: 600 })
        fireEvent.pointerMove(separator, { clientX: 450 })
        fireEvent.pointerUp(separator)
        expect(onRatioChange).not.toHaveBeenCalled()
        expect(onRatioCommit).not.toHaveBeenCalled()
    })

    it("moves with the arrows, Shift, Home and End, committing each change", () => {
        const { separator, onRatioChange, onRatioCommit } = setup()
        fireEvent.keyDown(separator, { key: "ArrowRight" })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.52)
        expect(onRatioCommit).toHaveBeenLastCalledWith(0.52)
        fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.4)
        fireEvent.keyDown(separator, { key: "Home" })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.32)
        fireEvent.keyDown(separator, { key: "End" })
        expect(onRatioChange).toHaveBeenLastCalledWith(0.68)
        expect(onRatioCommit).toHaveBeenCalledTimes(4)
    })

    it("does nothing for other keys or when already at the limit", () => {
        const { separator, onRatioChange } = setup(0.32)
        fireEvent.keyDown(separator, { key: "a" })
        fireEvent.keyDown(separator, { key: "Home" })
        expect(onRatioChange).not.toHaveBeenCalled()
    })

    it("resets to 50% on double click", () => {
        const { separator, onRatioChange, onRatioCommit } = setup(0.4)
        fireEvent.doubleClick(separator)
        expect(onRatioChange).toHaveBeenCalledWith(0.5)
        expect(onRatioCommit).toHaveBeenCalledWith(0.5)
    })
})
