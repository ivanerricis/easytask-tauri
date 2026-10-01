import { describe, expect, it } from "vitest"
import { applyLanguagePreference } from "@/i18n"
import { cn, formatDate, getErrorMessage } from "./utils"

describe("getErrorMessage", () => {
    it("returns the message of an Error", () => {
        expect(getErrorMessage(new Error("bad"))).toBe("bad")
    })

    it("returns the message of a plain object", () => {
        expect(getErrorMessage({ code: "X", message: "obj" })).toBe("obj")
    })

    it("stringifies a non-string message", () => {
        expect(getErrorMessage({ message: 42 })).toBe("42")
    })

    it("stringifies primitives and null", () => {
        expect(getErrorMessage("oops")).toBe("oops")
        expect(getErrorMessage(null)).toBe("null")
        expect(getErrorMessage(undefined)).toBe("undefined")
        expect(getErrorMessage(7)).toBe("7")
    })

    it("falls back to String for objects without message", () => {
        expect(getErrorMessage({ a: 1 })).toBe("[object Object]")
    })
})

describe("cn", () => {
    it("joins class names and drops falsy values", () => {
        expect(cn("a", false, null, undefined, "b")).toBe("a b")
    })

    it("supports conditional object syntax", () => {
        expect(cn({ a: true, b: false })).toBe("a")
    })

    it("resolves tailwind conflicts keeping the last one", () => {
        expect(cn("p-2", "p-4")).toBe("p-4")
        expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
    })
})

describe("formatDate", () => {
    it("uses DD-MM-YYYY in Italian and MM/DD/YYYY in English", async () => {
        expect(formatDate("2024-03-15")).toBe("15-03-2024")
        await applyLanguagePreference("en")
        expect(formatDate("2024-03-15")).toBe("03/15/2024")
        expect(formatDate("")).toBe("")
    })
})
