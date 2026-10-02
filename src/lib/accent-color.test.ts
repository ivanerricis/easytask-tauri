import { describe, expect, it } from "vitest"
import { applyAccentColor, textColorOn } from "./accent-color"

const DARK = "oklch(0.215 0 0)"
const LIGHT = "oklch(1 0 0)"

describe("textColorOn", () => {
    it("is dark on the default light orange (white would give 1.8:1)", () => {
        expect(textColorOn("#ffb375")).toBe(DARK)
    })

    it("is white on dark accents", () => {
        expect(textColorOn("#1e3a8a")).toBe(LIGHT)
        expect(textColorOn("#3366ff")).toBe(LIGHT)
        expect(textColorOn("#000000")).toBe(LIGHT)
        expect(textColorOn("#7c2d12")).toBe(LIGHT)
    })

    it("is dark on light accents", () => {
        expect(textColorOn("#ffffff")).toBe(DARK)
        expect(textColorOn("#facc15")).toBe(DARK)
        expect(textColorOn("#86efac")).toBe(DARK)
    })

    it("understands the short form and ignores the case and the #", () => {
        expect(textColorOn("#fff")).toBe(DARK)
        expect(textColorOn("#000")).toBe(LIGHT)
        expect(textColorOn("FFB375")).toBe(DARK)
        expect(textColorOn("#FFB375")).toBe(DARK)
    })

    it("falls back to the dark text for a value that is not a color", () => {
        expect(textColorOn("")).toBe(DARK)
        expect(textColorOn("orange")).toBe(DARK)
        expect(textColorOn("#12345")).toBe(DARK)
    })

    it("always picks the better of the two", () => {
        // Contrast of a color with the two candidates, computed apart from the module
        const channel = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
        const lum = (hex: string) => 0.2126 * channel(parseInt(hex.slice(1, 3), 16)) + 0.7152 * channel(parseInt(hex.slice(3, 5), 16)) + 0.0722 * channel(parseInt(hex.slice(5, 7), 16))
        const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#808080", "#777777", "#999999", "#ffa500", "#800080", "#40e0d0", "#a52a2a"]) {
            const chosen = textColorOn(hex) === LIGHT ? 1 : 0.215 ** 3
            const other = textColorOn(hex) === LIGHT ? 0.215 ** 3 : 1
            expect(ratio(lum(hex), chosen)).toBeGreaterThanOrEqual(ratio(lum(hex), other))
        }
    })
})

describe("applyAccentColor", () => {
    it("sets the accent and the text color on it", () => {
        const root = document.createElement("div")
        applyAccentColor("#ffb375", root)
        expect(root.style.getPropertyValue("--primary")).toBe("#ffb375")
        expect(root.style.getPropertyValue("--primary-foreground")).toBe(DARK)

        applyAccentColor("#1e3a8a", root)
        expect(root.style.getPropertyValue("--primary")).toBe("#1e3a8a")
        expect(root.style.getPropertyValue("--primary-foreground")).toBe(LIGHT)
    })

    it("applies to the page by default", () => {
        applyAccentColor("#ffb375")
        expect(document.documentElement.style.getPropertyValue("--primary-foreground")).toBe(DARK)
    })
})
