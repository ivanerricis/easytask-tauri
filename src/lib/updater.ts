import { check, type Update } from "@tauri-apps/plugin-updater"
import { openUrl } from "@tauri-apps/plugin-opener"
import { isPortable } from "@/db/appPaths"
import { getCheckUpdatesOnStartup, getSkippedUpdateVersion } from "@/lib/store/preferences"

export const RELEASES_URL = "https://github.com/ivanerricis/easytask-tauri/releases"
/** Window event that asks the app to open the settings dialog on a category. */
export const OPEN_SETTINGS_EVENT = "easytask:open-settings"
/** Window event fired by the startup check when a new version is available (the update dialog listens to it). */
export const UPDATE_AVAILABLE_EVENT = "easytask:update-available"

/** Detail of {@link UPDATE_AVAILABLE_EVENT}. */
export type UpdateAvailableDetail = { update: Update, portable: boolean }
const STARTUP_CHECK_DELAY_MS = 8000

/** Asks the app to open the settings dialog on the given category. */
export const requestOpenSettings = (category: string): void => {
    window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { category } }))
}

/**
 * Asks the update endpoint whether a newer version exists. Nothing is downloaded.
 * @returns The available update, or null when the app is up to date. Rejects when the check fails (offline, invalid key...).
 */
export const checkForUpdate = (): Promise<Update | null> => check()

/**
 * Silent check run shortly after startup: best effort, never throws and never shows an error.
 * When a version is available (and not skipped by the user) it fires {@link UPDATE_AVAILABLE_EVENT}, which opens the update dialog.
 * @returns The available update, or null (up to date, skipped, disabled or failed).
 */
export const runStartupUpdateCheck = async (): Promise<Update | null> => {
    try {
        if (!(await getCheckUpdatesOnStartup())) return null
        const update = await checkForUpdate()
        if (!update) return null
        if ((await getSkippedUpdateVersion().catch(() => null)) === update.version) return null
        const portable = await isPortable().catch(() => false)
        window.dispatchEvent(new CustomEvent<UpdateAvailableDetail>(UPDATE_AVAILABLE_EVENT, { detail: { update, portable } }))
        return update
    } catch (error) {
        console.warn("update check failed", error)
        return null
    }
}

/** Schedules the silent startup check a few seconds after the first render. */
export const scheduleStartupUpdateCheck = (): void => {
    setTimeout(() => { void runStartupUpdateCheck() }, STARTUP_CHECK_DELAY_MS)
}

/** Opens the GitHub releases page in the browser (the only URL the opener permission allows besides the repo). */
export const openReleasesPage = (): Promise<void> => openUrl(RELEASES_URL)
