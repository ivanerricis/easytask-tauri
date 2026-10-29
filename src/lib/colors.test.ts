import { describe, expect, it } from "vitest"
import { COLOR_ALPHA_BASE } from "./color-intensity"
import { PALETTE_COLORS, isHexColor, isPaletteColor, parseHex } from "./colors"

/** sRGB of a gray `oklch(L 0 0)` (the grays of the themes, see index.css). */
const gray = (lightness: number) => {
    const linear = lightness ** 3
    const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
    const value = Math.round(Math.min(Math.max(encoded, 0), 1) * 255)
    return [value, value, value] as const
}

const channel = (value: number) => {
    const s = value / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (c: readonly number[]) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
const contrast = (a: readonly number[], b: readonly number[]) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (high + 0.05) / (low + 0.05)
}
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const blend = (color: readonly number[], alpha: number, surface: readonly number[]) => color.map((v, i) => Math.round(v * alpha + surface[i] * (1 - alpha)))

// Foreground and surfaces of the two themes (values of index.css), and where each colored element sits
const THEMES = {
    light: { foreground: gray(0.145), background: gray(1), secondary: gray(0.97), accent: gray(0.94) },
    dark: { foreground: gray(0.985), background: gray(0.2156), secondary: gray(0.269), accent: gray(0.32) },
}
const ELEMENTS = [
    { name: "group header", surface: "background", alpha: COLOR_ALPHA_BASE.header },
    { name: "section header", surface: "accent", alpha: COLOR_ALPHA_BASE.header },
    { name: "sidebar row", surface: "secondary", alpha: COLOR_ALPHA_BASE.item },
    { name: "sidebar row hovered", surface: "secondary", alpha: COLOR_ALPHA_BASE.itemHover },
] as const

describe("palette", () => {
    it("recognizes its colors, in any case", () => {
        expect(isPaletteColor(PALETTE_COLORS[2])).toBe(true)
        expect(isPaletteColor(PALETTE_COLORS[2].toUpperCase())).toBe(true)
        expect(isPaletteColor("#123456")).toBe(false)
        expect(isPaletteColor(null)).toBe(false)
    })

    it("has no repeated color", () => {
        expect(new Set(PALETTE_COLORS).size).toBe(PALETTE_COLORS.length)
    })

    // At the default intensity every color of the palette keeps the normal text readable (WCAG AA, 4.5:1) in both themes
    for (const [themeName, theme] of Object.entries(THEMES)) {
        for (const element of ELEMENTS) {
            it(`keeps the text readable on a ${element.name} in the ${themeName} theme`, () => {
                const surface = theme[element.surface]
                const unreadable = PALETTE_COLORS
                    .map(color => ({ color, ratio: contrast(theme.foreground, blend(rgb(color), element.alpha, surface)) }))
                    .filter(({ ratio }) => ratio < 4.5)
                expect(unreadable).toEqual([])
            })
        }
    }
})

describe("parseHex / isHexColor", () => {
    it.each([["#fff", [255, 255, 255]], ["#C2410C", [194, 65, 12]], ["c2410c", [194, 65, 12]], [" #0a0 ", [0, 170, 0]]])("parses %s", (hex, rgb) => {
        expect(parseHex(hex)).toEqual(rgb)
    })

    it.each(["", "red", "#12", "#12345g", "#1234567", "url(x)"])("returns null for %j", (hex) => {
        expect(parseHex(hex)).toBeNull()
    })

    it("isHexColor requires exactly #rgb or #rrggbb", () => {
        expect(["#fff", "#FFB375"].every(isHexColor)).toBe(true)
        expect(["fff", " #fff", "#ffff", "red", 3, null, undefined].some(isHexColor)).toBe(false)
    })
})
