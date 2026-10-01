import { invoke } from "@tauri-apps/api/core";

let dataDirPromise: Promise<string> | null = null;
let portablePromise: Promise<boolean> | null = null;

/**
 * Resolves (once) the folder that holds all the app data: database, settings, backups and logs.
 * The Rust side decides it (portable.txt next to the exe, EASYTASK_DATA_DIR override or Documents/EasyTask),
 * creates it and grants the runtime fs scope on it. Every access to the data goes through this function.
 * A failure is not cached, so the next call retries.
 * @returns Promise resolving to the absolute path of the data folder.
 * @category Database
 */
export function ensureAppFolder(): Promise<string> {
    if (!dataDirPromise) {
        dataDirPromise = invoke<string>("data_dir").catch((err: unknown) => {
            dataDirPromise = null;
            throw err;
        });
    }
    return dataDirPromise;
}

/**
 * Tells whether the app runs in portable mode (portable.txt next to the executable). Cached.
 * @returns Promise resolving to true in portable mode.
 * @category Database
 */
export function isPortable(): Promise<boolean> {
    if (!portablePromise) {
        portablePromise = invoke<boolean>("is_portable").catch((err: unknown) => {
            portablePromise = null;
            throw err;
        });
    }
    return portablePromise;
}

/** Forgets the cached values (tests only). */
export function resetAppPathsCache(): void {
    dataDirPromise = null;
    portablePromise = null;
}
