import { getPref, savePref } from "./preferences"

/**
 * Gets the share of the width given to the left pane of the split workspace (global, not per workspace).
 * @returns A promise that resolves to the stored ratio, or to 0.5 when nothing valid is stored.
 * @category Store
 */
export const getSplitRatio = (): Promise<number> => getPref("splitRatio")

/**
 * Saves the share of the width given to the left pane (debounced like the other preferences).
 * @param ratio The ratio (0-1); it is brought into the allowed range first.
 * @category Store
 */
export const saveSplitRatio = (ratio: number): Promise<void> => savePref("splitRatio", ratio)
