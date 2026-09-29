import { describe, expect, it } from "vitest"
import { getErrorMessage } from "./errorMessage"

describe("db getErrorMessage", () => {
    it("returns the message of an Error", () => {
        expect(getErrorMessage(new Error("bad"))).toBe("bad")
    })

    it("stringifies strings and other values", () => {
        expect(getErrorMessage("oops")).toBe("oops")
        expect(getErrorMessage(null)).toBe("null")
        expect(getErrorMessage(5)).toBe("5")
    })

    it("does not read message from plain objects", () => {
        expect(getErrorMessage({ message: "x" })).toBe("[object Object]")
    })
})
