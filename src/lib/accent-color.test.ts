import { describe, expect, it } from "vitest"
import { ACCENT_MIN_CONTRAST, DEFAULT_PRIMARY_COLOR, accentContrast, applyAccentColor, suggestAccentColor, textColorOn } from "./accent-color"

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

describe("accent contrast with the background", () => {
    it("measures it against the background of each theme", () => {
        expect(accentContrast("#ffffff", "light")).toBeCloseTo(1, 1)
        expect(accentContrast("#000000", "light")).toBeCloseTo(21, 0)
        expect(accentContrast("#c2410c", "light")!).toBeGreaterThan(5)
        expect(accentContrast("#c2410c", "dark")!).toBeGreaterThan(ACCENT_MIN_CONTRAST)
        expect(accentContrast("nope", "light")).toBeNull()
    })

    it("suggests nothing when the contrast is enough, or the color is not valid", () => {
        expect(suggestAccentColor(DEFAULT_PRIMARY_COLOR, "light")).toBeNull()
        expect(suggestAccentColor(DEFAULT_PRIMARY_COLOR, "dark")).toBeNull()
        expect(suggestAccentColor("zzz", "light")).toBeNull()
    })

    it("suggests a darker color of the same hue on the light theme", () => {
        const suggestion = suggestAccentColor("#ffe119", "light")!
        expect(accentContrast("#ffe119", "light")!).toBeLessThan(ACCENT_MIN_CONTRAST)
        expect(accentContrast(suggestion, "light")!).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST)
        // Still a yellow-ish color (red and green channels well above blue), not a gray
        const [r, g, b] = [1, 3, 5].map(i => parseInt(suggestion.slice(i, i + 2), 16))
        expect(r).toBeGreaterThan(b + 40)
        expect(g).toBeGreaterThan(b + 40)
    })

    it("suggests a lighter color on the dark theme", () => {
        const suggestion = suggestAccentColor("#1e3a8a", "dark")!
        expect(accentContrast("#1e3a8a", "dark")!).toBeLessThan(ACCENT_MIN_CONTRAST)
        expect(accentContrast(suggestion, "dark")!).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST)
        expect(parseInt(suggestion.slice(5, 7), 16)).toBeGreaterThan(parseInt("8a", 16))
    })

    it("falls back to black or white for the extremes", () => {
        expect(accentContrast(suggestAccentColor("#ffffff", "light")!, "light")!).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST)
        expect(accentContrast(suggestAccentColor("#000000", "dark")!, "dark")!).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST)
    })
})
