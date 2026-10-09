import { useContext } from "react"
import { PreferencesContext } from "./preferences-context-object"
import { COLOR_ALPHA_BASE, clampColorIntensity, scaleAlpha } from "@/lib/color-intensity"

/**
 * Gives the alphas of the colored elements already scaled by the "color intensity" preference.
 * Without a PreferencesProvider the default intensity (100%) is used.
 */
export const useColorAlpha = () => {
    const intensity = clampColorIntensity(useContext(PreferencesContext)?.colorIntensity)
    // The light background of the colored tasks can be turned off in the settings (on by default)
    const taskBackground = useContext(PreferencesContext)?.taskBackground !== false
    return {
        intensity,
        taskBackground,
        item: (hovered = false) => scaleAlpha(hovered ? COLOR_ALPHA_BASE.itemHover : COLOR_ALPHA_BASE.item, intensity),
        header: () => scaleAlpha(COLOR_ALPHA_BASE.header, intensity),
        task: () => scaleAlpha(COLOR_ALPHA_BASE.task, intensity),
    }
}
