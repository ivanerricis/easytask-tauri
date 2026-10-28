import { getCurrentWebview } from "@tauri-apps/api/webview"
import { DEFAULT_TEXT_ZOOM, textPxFromZoom, textZoomFromPx, type TextZoom } from "@/lib/store/preferences"
import { reportError } from "@/lib/report-error"

/** The zoom one px of text bigger (+1) or smaller (-1) than `zoom`; it stays within the limits. */
export const stepTextZoom = (zoom: TextZoom, direction: 1 | -1): TextZoom =>
    textZoomFromPx(textPxFromZoom(zoom) + direction)

/**
 * Zooms the whole window (like the zoom of a browser: text, icons and spaces) through the webview, so the layout is measured
 * at the new size. Outside the app (tests, browser) there is no webview and nothing happens.
 */
export const applyTextZoom = (zoom: TextZoom): void => {
    if (!("__TAURI_INTERNALS__" in window)) return
    getCurrentWebview().setZoom(zoom).catch(error => reportError(error))
}

export { DEFAULT_TEXT_ZOOM }
