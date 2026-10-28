import { afterEach, describe, expect, it, vi } from "vitest"

const setZoom = vi.fn()
vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: () => ({ setZoom }) }))

import { applyTextZoom, stepTextZoom } from "./text-zoom"

afterEach(() => {
    vi.clearAllMocks()
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
})

describe("stepTextZoom", () => {
    it("moves one px of text up or down", () => {
        expect(stepTextZoom(1, 1)).toBe(17 / 16)
        expect(stepTextZoom(1, -1)).toBe(15 / 16)
    })

    it("stays within 12 and 24 px", () => {
        expect(stepTextZoom(24 / 16, 1)).toBe(24 / 16)
        expect(stepTextZoom(12 / 16, -1)).toBe(12 / 16)
    })
})

describe("applyTextZoom", () => {
    it("zooms the webview inside the app", () => {
        Object.assign(window, { __TAURI_INTERNALS__: {} })
        setZoom.mockResolvedValue(undefined)
        applyTextZoom(1.15)
        expect(setZoom).toHaveBeenCalledWith(1.15)
    })

    it("does nothing outside the app", () => {
        applyTextZoom(1.15)
        expect(setZoom).not.toHaveBeenCalled()
    })
})
