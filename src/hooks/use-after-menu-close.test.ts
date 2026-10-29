import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useAfterMenuClose } from "./use-after-menu-close"
import { useRenameAfterClose } from "./use-rename-after-close"

const closeEvent = () => ({ preventDefault: vi.fn() }) as unknown as Event & { preventDefault: ReturnType<typeof vi.fn> }

describe("useAfterMenuClose", () => {
    it("does nothing when the menu closes without a request", () => {
        const action = vi.fn()
        const { result } = renderHook(() => useAfterMenuClose(action))
        const e = closeEvent()
        result.current.onCloseAutoFocus(e)
        expect(action).not.toHaveBeenCalled()
        expect(e.preventDefault).not.toHaveBeenCalled()
    })

    it("runs the action once, keeping the focus where it is, after a request", () => {
        const action = vi.fn()
        const { result } = renderHook(() => useAfterMenuClose(action))
        result.current.request()
        const e = closeEvent()
        result.current.onCloseAutoFocus(e)
        expect(e.preventDefault).toHaveBeenCalled()
        expect(action).toHaveBeenCalledTimes(1)
        result.current.onCloseAutoFocus(closeEvent())
        expect(action).toHaveBeenCalledTimes(1)
    })

    it("tolerates a missing action", () => {
        const { result } = renderHook(() => useAfterMenuClose())
        result.current.request()
        expect(() => result.current.onCloseAutoFocus(closeEvent())).not.toThrow()
    })
})

describe("useRenameAfterClose", () => {
    it("is the same behaviour under the rename names", () => {
        const onRename = vi.fn()
        const { result } = renderHook(() => useRenameAfterClose(onRename))
        result.current.requestRename()
        result.current.onCloseAutoFocus(closeEvent())
        expect(onRename).toHaveBeenCalledTimes(1)
    })
})
