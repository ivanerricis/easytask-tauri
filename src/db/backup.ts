import { join } from "@tauri-apps/api/path"
import { copyFile, exists, mkdir, readDir, remove, rename, stat } from "@tauri-apps/plugin-fs"
import { relaunch } from "@tauri-apps/plugin-process"
import Database from "@tauri-apps/plugin-sql"
import i18n from "@/i18n"
import { reportError } from "@/lib/report-error"
import { getAutoBackup, getBackupKeep } from "@/lib/store/preferences"
import { createError } from "@/types/error"
import { ensureAppFolder } from "./appPaths"
import { closeDB, DB_FILE, getDB, setRestoring } from "./dbManager"
import { APPLICATION_ID, LATEST_SCHEMA_VERSION } from "./initDb"

export const BACKUP_FOLDER = "backups"

const REGULAR_PATTERN = /^easytask-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-(\d+))?\.db$/
const PRE_RESTORE_PATTERN = /^easytask-pre-restore-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(?:-(\d+))?\.db$/

export type BackupKind = "manual" | "auto" | "pre-restore"

export type BackupInfo = {
    /** File name inside the backups folder. */
    name: string
    /** Absolute path of the file. */
    path: string
    /** Size in bytes (0 if unknown). */
    size: number
    /** Moment the backup was taken, read from the file name. */
    date: Date
    /** True for the safety copy made right before a restore. */
    preRestore: boolean
}

const pad = (value: number) => String(value).padStart(2, "0")

/** "YYYYMMDD-HHmmss" in local time. */
export function formatTimestamp(date: Date): string {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/** Builds the file name of a backup taken at `date`; `sequence` (>= 2) disambiguates backups taken in the same second. */
export function backupFileName(date: Date, preRestore = false, sequence = 1): string {
    return `easytask-${preRestore ? "pre-restore-" : ""}${formatTimestamp(date)}${sequence > 1 ? `-${sequence}` : ""}.db`
}

/** Reads the date out of a backup file name; null when the name is not a backup name. */
export function parseBackupName(name: string): { date: Date, preRestore: boolean, sequence: number } | null {
    const preRestore = PRE_RESTORE_PATTERN.exec(name)
    const match = preRestore ?? REGULAR_PATTERN.exec(name)
    if (!match) return null
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number)
    return { date: new Date(year, month - 1, day, hour, minute, second), preRestore: preRestore !== null, sequence: match[7] ? Number(match[7]) : 1 }
}

async function backupFolderPath(): Promise<string> {
    const folder = await join(await ensureAppFolder(), BACKUP_FOLDER)
    if (!(await exists(folder))) await mkdir(folder, { recursive: true })
    return folder
}

/**
 * Lists the backups in the data folder, newest first.
 * @category Database
 */
export async function listBackups(): Promise<BackupInfo[]> {
    const folder = await backupFolderPath()
    const entries = await readDir(folder)
    const backups: BackupInfo[] = []
    for (const entry of entries) {
        const parsed = entry.isFile ? parseBackupName(entry.name) : null
        if (!parsed) continue
        const path = await join(folder, entry.name)
        const size = await stat(path).then(info => info.size, () => 0)
        backups.push({ name: entry.name, path, size, date: parsed.date, preRestore: parsed.preRestore })
    }
    const sequenceOf = (backup: BackupInfo) => parseBackupName(backup.name)?.sequence ?? 1
    return backups.sort((a, b) => b.date.getTime() - a.date.getTime() || sequenceOf(b) - sequenceOf(a) || b.name.localeCompare(a.name))
}

/**
 * Deletes the oldest regular backups, keeping the last `keep`. The pre-restore copy is not counted.
 * @returns How many files were deleted.
 * @category Database
 */
export async function rotateBackups(keep: number): Promise<number> {
    const regular = (await listBackups()).filter(backup => !backup.preRestore)
    const stale = regular.slice(Math.max(1, keep))
    for (const backup of stale) await remove(backup.path)
    return stale.length
}

/**
 * Writes a consistent copy of the database (VACUUM INTO, outside any transaction) in the backups folder.
 * Regular backups are then rotated according to the "keep" preference; only the newest pre-restore copy is kept.
 * @returns The created backup.
 * @category Database
 */
export async function createBackup(kind: BackupKind = "manual"): Promise<BackupInfo> {
    const folder = await backupFolderPath()
    const date = new Date()
    const preRestore = kind === "pre-restore"
    // Two backups in the same second would make VACUUM INTO fail on the existing file: add a numeric suffix
    let name = backupFileName(date, preRestore)
    let path = await join(folder, name)
    for (let sequence = 2; await exists(path); sequence++) {
        name = backupFileName(date, preRestore, sequence)
        path = await join(folder, name)
    }

    const db = await getDB()
    // The file name goes into the SQL as a literal: single quotes are escaped by doubling them
    await db.execute(`VACUUM INTO '${path.replace(/'/g, "''")}'`)

    if (preRestore) {
        const previous = (await listBackups()).filter(backup => backup.preRestore && backup.name !== name)
        for (const backup of previous) await remove(backup.path)
    } else {
        await rotateBackups(await getBackupKeep())
    }
    const size = await stat(path).then(info => info.size, () => 0)
    return { name, path, size, date, preRestore }
}

/**
 * Backup at startup: skipped when disabled or when a backup was already taken today.
 * Best effort: a failure is only logged, never shown or thrown.
 * @returns True when a backup was created.
 * @category Database
 */
export async function runAutoBackup(): Promise<boolean> {
    try {
        if (!(await getAutoBackup())) return false
        const today = formatTimestamp(new Date()).slice(0, 8)
        const taken = (await listBackups()).some(backup => !backup.preRestore && formatTimestamp(backup.date).startsWith(today))
        if (taken) return false
        await createBackup("auto")
        return true
    } catch (error) {
        reportError(error)
        return false
    }
}

function assertBackupName(name: string): void {
    if (!parseBackupName(name)) throw new Error(`Invalid backup name: ${name}`)
}

/**
 * Deletes one backup file.
 * @category Database
 */
export async function deleteBackup(name: string): Promise<void> {
    assertBackupName(name)
    await remove(await join(await backupFolderPath(), name))
}

/**
 * Opens a backup read-only and checks that it is an EasyTask database this build can use:
 * application_id, user_version not newer than the known migrations and PRAGMA integrity_check.
 * @throws A "BACKUP_INVALID" error (translated) when the file is not a usable EasyTask database.
 * @category Database
 */
async function validateBackupFile(path: string): Promise<void> {
    const invalid = () => createError("BACKUP_INVALID", i18n.t("errors.backup.invalid"))
    let db: Database
    try {
        db = await Database.load(`sqlite:${path}?mode=ro`)
    } catch {
        throw invalid()
    }
    try {
        const [{ application_id: applicationId = 0 } = {}] = await db.select<{ application_id: number }[]>("PRAGMA application_id")
        const [{ user_version: version = 0 } = {}] = await db.select<{ user_version: number }[]>("PRAGMA user_version")
        if (applicationId !== APPLICATION_ID) throw invalid()
        if (version > LATEST_SCHEMA_VERSION) throw createError("BACKUP_NEWER", i18n.t("errors.backup.newer"))
        const check = await db.select<{ integrity_check: string }[]>("PRAGMA integrity_check")
        if (check.length !== 1 || check[0].integrity_check !== "ok") throw invalid()
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error) throw error
        throw invalid()
    } finally {
        await db.close().catch(() => false)
    }
}

/**
 * Replaces the database with a backup and restarts the app. The backup is validated first (see validateBackupFile),
 * then a pre-restore copy of the current database is taken. The database is closed (getDB() rejects meanwhile),
 * its -wal/-shm files removed, and the backup copied to "<db>.restoring" and renamed over the database, so a
 * failure never leaves a half-written database.
 * @category Database
 */
export async function restoreBackup(name: string): Promise<void> {
    assertBackupName(name)
    const folder = await backupFolderPath()
    const source = await join(folder, name)
    if (!(await exists(source))) throw new Error(`Backup not found: ${name}`)

    await validateBackupFile(source)
    await createBackup("pre-restore")

    const target = await join(await ensureAppFolder(), DB_FILE)
    const temp = `${target}.restoring`
    let relaunching = false
    setRestoring(true)
    try {
        await closeDB()
        for (const suffix of ["-wal", "-shm"]) {
            const sidecar = `${target}${suffix}`
            if (await exists(sidecar)) await remove(sidecar)
        }
        try {
            await copyFile(source, temp)
            await rename(temp, target)
        } catch (error) {
            await remove(temp).catch(() => undefined)
            throw error
        }
        relaunching = true
        await relaunch()
    } finally {
        // On success the app is restarting: keep refusing the database until the process exits
        if (!relaunching) setRestoring(false)
    }
}
