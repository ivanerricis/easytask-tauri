import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/report-error", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/report-error")>()), reportError: vi.fn() }))
vi.mock("@fontsource-variable/inter/wght.css", () => ({}))

import { applyFontFamily } from "./font-family"

beforeEach(() => { delete document.documentElement.dataset.font })

describe("applyFontFamily", () => {
    it("sets the font on the root element", () => {
        applyFontFamily("system")
        expect(document.documentElement.dataset.font).toBe("system")
        applyFontFamily("inter")
        expect(document.documentElement.dataset.font).toBe("inter")
    })
})
