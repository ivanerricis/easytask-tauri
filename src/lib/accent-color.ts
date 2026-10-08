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
