import { describe, expect, it } from "vitest"
import { MAX_NAME_LENGTH } from "./names"

describe("MAX_NAME_LENGTH", () => {
    it("è 120 caratteri", () => {
        expect(MAX_NAME_LENGTH).toBe(120)
    })
})
