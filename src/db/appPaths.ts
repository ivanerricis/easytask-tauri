import { BaseDirectory, documentDir, join } from "@tauri-apps/api/path";
import { exists, mkdir } from "@tauri-apps/plugin-fs";

const APP_FOLDER = "EasyTask";

/**
 * Ensures the EasyTask folder exists inside the user's Documents folder.
 * @returns Promise resolving to the absolute path of the folder.
 * @category Database
 */
export async function ensureAppFolder(): Promise<string> {
    // fs calls use a path relative to Documents to match the capability scope
    if (!(await exists(APP_FOLDER, { baseDir: BaseDirectory.Document }))) {
        await mkdir(APP_FOLDER, { recursive: true, baseDir: BaseDirectory.Document });
    }

    return join(await documentDir(), APP_FOLDER);
}
