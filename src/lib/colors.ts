/** The colors an item can be given with one click (menus and creation dialogs). */
export const PALETTE_COLORS = [
    '#e6194b', '#3cb44b', '#d9bf01', '#4363d8',
    '#f58231', '#911eb4', '#13d7d7', '#f032e6',
    '#9dcf01', '#ebb0b0', '#008080', '#d7b0f0',
    '#9a6324', '#c4bf8f', '#000075',
] as const

export const isPaletteColor = (color: string | null | undefined): boolean =>
    !!color && (PALETTE_COLORS as readonly string[]).includes(color.toLowerCase())
