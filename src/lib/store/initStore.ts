import { Store } from "@tauri-apps/plugin-store"
import { join } from "@tauri-apps/api/path"
import { ensureAppFolder } from "@/db/appPaths"

/**
 * Loads the settings store, falling back to the app data folder if the
 * documents folder is not accessible, so a failure never blocks the UI.
 */
async function loadStore(): Promise<Store> {
    try {
        const folderPath = await ensureAppFolder()
        return await Store.load(await join(folderPath, "settings.dat"))
    } catch (err: unknown) {
        console.error("Unable to load settings from the EasyTask folder, using the app data folder", err)
        try {
            return await Store.load("settings.dat")
        } catch (fallbackErr: unknown) {
            throw new Error(`Unable to load the settings store: ${String(fallbackErr)}`, { cause: fallbackErr })
        }
    }
}

export const store = await loadStore()
