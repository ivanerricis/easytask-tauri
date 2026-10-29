import { invoke } from "@tauri-apps/api/core"
import { getErrorMessage } from "@/lib/utils"

/**
 * Returns the function that opens the data folder (or a subfolder of it, e.g. "backups") in the file explorer.
 * The previous error is cleared first (`setError(null)`); if opening fails, `setError` gets the message.
 */
export function useOpenDataFolder(setError: (message: string | null) => void, subfolder?: string) {
    return async () => {
        setError(null)
        try {
            if (subfolder === undefined) await invoke("open_data_folder")
            else await invoke("open_data_folder", { subfolder })
        } catch (err) {
            setError(getErrorMessage(err))
        }
    }
}
