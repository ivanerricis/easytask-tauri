/**
 * The accent color of a new install and of the reset: a deep orange (Tailwind orange-700) that carries white text at
 * about 5.2:1, so the buttons read white on both themes (the brighter orange-500 it replaces needed dark text).
 * Keep it in sync with `--primary` and `--primary-foreground` in index.css.
 */
export const DEFAULT_PRIMARY_COLOR = "#c2410c"

/** Text colors on the accent: the dark one is the `--primary-foreground` of the dark theme, the other is white. */
const DARK_TEXT = "oklch(0.215 0 0)"
const LIGHT_TEXT = "oklch(1 0 0)"
/** Relative luminance of those two (the dark one is oklch L 0.215, whose luminance is L cubed). */
const DARK_LUMINANCE = 0.215 ** 3
const LIGHT_LUMINANCE = 1

/** WCAG relative luminance of a "#rgb" or "#rrggbb" color, null when it is not one. */
const luminance = (hex: string): number | null => {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
    if (!match) return null
    const digits = match[1].length === 3 ? match[1].split("").map(d => d + d).join("") : match[1]
    const [r, g, b] = [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two luminances. */
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/**
 * The color of the text and icons on the accent color: dark or white, whichever reads better on it.
 * (The accent is chosen by the user: on the default deep orange white gives 5.2:1, on a bright orange like #f97316 dark text wins.)
 * @param hex The accent color, "#rgb" or "#rrggbb".
 * @returns A CSS color; the dark one when `hex` is not a valid color.
 * @category Theme
 */
export const textColorOn = (hex: string): string => {
    const accent = luminance(hex)
    if (accent === null) return DARK_TEXT
    return contrast(accent, LIGHT_LUMINANCE) > contrast(accent, DARK_LUMINANCE) ? LIGHT_TEXT : DARK_TEXT
}

/**
 * Applies the accent color to the page: `--primary` and the matching `--primary-foreground`.
 * @param hex The accent color.
 * @param root The element that holds the theme variables (the document element).
 * @category Theme
 */
export const applyAccentColor = (hex: string, root: HTMLElement = document.documentElement): void => {
    root.style.setProperty("--primary", hex)
    root.style.setProperty("--primary-foreground", textColorOn(hex))
}

/** Minimum contrast of the accent with the background for borders, selections and focus rings (WCAG 1.4.11, non-text: 3:1). */
export const ACCENT_MIN_CONTRAST = 3

/** Relative luminance of the background of the two themes (`--background`: white, and oklch L 0.2156 whose luminance is L cubed). */
const THEME_BACKGROUND_LUMINANCE = { light: 1, dark: 0.2156 ** 3 } as const

export type AccentTheme = keyof typeof THEME_BACKGROUND_LUMINANCE

/**
 * Contrast ratio of the accent color with the background of a theme.
 * @returns The ratio (1-21), or null when `hex` is not a valid color.
 * @category Theme
 */
export const accentContrast = (hex: string, theme: AccentTheme): number | null => {
    const accent = luminance(hex)
    return accent === null ? null : contrast(accent, THEME_BACKGROUND_LUMINANCE[theme])
}

const toHsl = (hex: string): [number, number, number] | null => {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
    if (!match) return null
    const digits = match[1].length === 3 ? match[1].split("").map(d => d + d).join("") : match[1]
    const [r, g, b] = [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    const d = max - min
    if (d === 0) return [0, 0, l]
    const s = d / (1 - Math.abs(2 * l - 1))
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    return [(h * 60 + 360) % 360, s, l]
}

const fromHsl = (h: number, s: number, l: number): string => {
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const channel = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
    return `#${[0, 8, 4].map(n => channel(n).toString(16).padStart(2, "0")).join("")}`
}

/**
 * A color close to the accent with enough contrast with the background of a theme: same hue and saturation, with the
 * lightness moved the least that is needed (darker on the light theme, lighter on the dark one).
 * @returns The suggested "#rrggbb", or null when the accent already has enough contrast (or is not a valid color).
 * @category Theme
 */
export const suggestAccentColor = (hex: string, theme: AccentTheme): string | null => {
    const current = accentContrast(hex, theme)
    const hsl = toHsl(hex)
    if (current === null || hsl === null || current >= ACCENT_MIN_CONTRAST) return null
    const [h, s, l] = hsl
    const step = theme === "light" ? -0.005 : 0.005
    for (let lightness = l + step; lightness >= 0 && lightness <= 1; lightness += step) {
        const candidate = fromHsl(h, s, lightness)
        // A little margin over the minimum, so that rounding to 8 bits per channel cannot bring it below
        if ((accentContrast(candidate, theme) ?? 0) >= ACCENT_MIN_CONTRAST + 0.1) return candidate
    }
    return theme === "light" ? "#000000" : "#ffffff"
}
