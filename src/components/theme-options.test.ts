import { describe, expect, it } from "vitest"
import { isTheme, THEME_OPTIONS } from "./theme-options"

describe("THEME_OPTIONS", () => {
    it("lists light, dark and system in this order", () => {
        expect(THEME_OPTIONS.map(option => option.value)).toEqual(["light", "dark", "system"])
    })

    it("every option has an icon and a translation key", () => {
        for (const option of THEME_OPTIONS) {
            expect(option.icon).toBeTruthy()
            expect(option.labelKey).toMatch(/^[a-z]+\./i)
        }
    })
})

describe("isTheme", () => {
    it("accepts the themes and rejects anything else", () => {
        expect(isTheme("light")).toBe(true)
        expect(isTheme("dark")).toBe(true)
        expect(isTheme("system")).toBe(true)
        expect(isTheme("sepia")).toBe(false)
        expect(isTheme("")).toBe(false)
    })
})
