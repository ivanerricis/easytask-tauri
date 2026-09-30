import type { AudioFile } from "@/types/types";
import { createError, handleDBError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";

/**
 * Extensions (lowercase, without dot) of the audio files that can be attached to a group.
 * Kept in sync with the allow list of the Rust commands audio_file_exists / allow_audio_file.
 * @category Database Queries
 */
export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"] as const

const COLUMNS = "id, section_groupID, name, path, position, creation_date, creation_time"

/**
 * Returns the file name of an absolute path (Windows or POSIX separators).
 * @param path Absolute path of the file.
 * @category Database Queries
 */
export function getFileName(path: string): string {
    const parts = path.split(/[\\/]/)
    return parts[parts.length - 1] || path
}

/**
 * Returns a name that does not clash with the given ones (case insensitive):
 * "song.mp3" -> "song (2).mp3" -> "song (3).mp3", the counter goes before the extension.
 * @param name Wanted name.
 * @param taken Names already used in the group (trashed files included, they still hold the UNIQUE constraint).
 * @category Database Queries
 */
export function makeUniqueName(name: string, taken: string[]): string {
    const used = new Set(taken.map(item => item.toLowerCase()))
    if (!used.has(name.toLowerCase())) return name

    const dot = name.lastIndexOf(".")
    const base = dot > 0 ? name.slice(0, dot) : name
    const extension = dot > 0 ? name.slice(dot) : ""
    for (let counter = 2; ; counter++) {
        const candidate = `${base} (${counter})${extension}`
        if (!used.has(candidate.toLowerCase())) return candidate
    }
}

/**
 * Retrieves the audio files of a group (not deleted), in position order.
 * @param groupId The ID of the group.
 * @category Database Queries
 */
export async function getDBGroupAudioFiles(groupId: number): Promise<AudioFile[]> {
    try {
        const db = await getDB()
        return await db.select<AudioFile[]>(
            `SELECT ${COLUMNS} FROM audio_file WHERE section_groupID = ? AND deleted_at IS NULL ORDER BY position, id`,
            [groupId])
    } catch (error: unknown) {
        throw createError("AUDIO_LOAD_FAILED", "Failed to load the audio files: " + getErrorMessage(error))
    }
}

/**
 * Retrieves the audio files of every visible group of a note, grouped by group ID (not deleted files only).
 * Groups without audio files have no entry.
 * @param noteId The ID of the note.
 * @category Database Queries
 */
export async function getDBNoteAudioFiles(noteId: number): Promise<Record<number, AudioFile[]>> {
    try {
        const db = await getDB()
        const rows = await db.select<AudioFile[]>(
            `SELECT a.id, a.section_groupID, a.name, a.path, a.position, a.creation_date, a.creation_time
             FROM audio_file a INNER JOIN section_group g ON g.id = a.section_groupID
             WHERE g.noteID = ? AND g.deleted_at IS NULL AND a.deleted_at IS NULL
             ORDER BY a.section_groupID, a.position, a.id`, [noteId])

        const byGroup: Record<number, AudioFile[]> = {}
        for (const row of rows) (byGroup[row.section_groupID] ??= []).push(row)
        return byGroup
    } catch (error: unknown) {
        throw createError("AUDIO_LOAD_FAILED", "Failed to load the audio files: " + getErrorMessage(error))
    }
}

/**
 * Retrieves one audio file (null when it does not exist or is in the trash).
 * @param audioId The ID of the audio file.
 * @category Database Queries
 */
export async function getDBAudioFile(audioId: number): Promise<AudioFile | null> {
    try {
        const db = await getDB()
        const rows = await db.select<AudioFile[]>(
            `SELECT ${COLUMNS} FROM audio_file WHERE id = ? AND deleted_at IS NULL`, [audioId])
        return rows[0] ?? null
    } catch (error: unknown) {
        throw createError("AUDIO_LOAD_FAILED", "Failed to load the audio file: " + getErrorMessage(error))
    }
}

/**
 * Attaches an audio file to a group, appended after the others. Only the path is stored.
 * The name is the file name; when the group already has (or has trashed) a file with that name a counter is
 * added ("song (2).mp3"), because of the UNIQUE(name, section_groupID) constraint.
 * @param groupId The ID of the group.
 * @param path Absolute path of the file.
 * @returns The created audio file.
 * @category Database Queries
 */
export async function createDBAudioFile(groupId: number, path: string): Promise<AudioFile> {
    try {
        const db = await getDB()
        const taken = await db.select<{ name: string }[]>(
            'SELECT name FROM audio_file WHERE section_groupID = ?', [groupId])
        const name = makeUniqueName(getFileName(path), taken.map(row => row.name))

        const result = await db.execute(
            `INSERT INTO audio_file (section_groupID, name, path, position)
             SELECT ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM audio_file
             WHERE section_groupID = ? AND deleted_at IS NULL`,
            [groupId, name, path, groupId])

        const created = result.lastInsertId !== undefined ? await getDBAudioFile(result.lastInsertId) : null
        if (!created) throw createError("AUDIO_UNKNOWN_ERROR", "The audio file was not created.")
        return created
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "code" in error) throw error
        handleDBError(error, "AUDIO", {
            UNIQUE: "A file with this name already exists in the group.",
            CHECK: "The file name and path cannot be empty.",
        })
        throw error
    }
}

/**
 * Renames an audio file (the file on disk is not touched).
 * @param audioId The ID of the audio file.
 * @param name The new display name.
 * @category Database Queries
 */
export async function renameDBAudioFile(audioId: number, name: string) {
    try {
        const db = await getDB()
        await db.execute('UPDATE audio_file SET name = ? WHERE id = ?', [name, audioId])
    } catch (error: unknown) {
        handleDBError(error, "AUDIO", {
            UNIQUE: "A file with this name already exists in the group.",
            CHECK: "The name cannot be empty.",
        })
    }
}

/**
 * Points an audio file to a new location (relink after the file was moved). The display name is kept.
 * @param audioId The ID of the audio file.
 * @param path New absolute path.
 * @category Database Queries
 */
export async function updateDBAudioFilePath(audioId: number, path: string) {
    try {
        const db = await getDB()
        await db.execute('UPDATE audio_file SET path = ? WHERE id = ?', [path, audioId])
    } catch (error: unknown) {
        handleDBError(error, "AUDIO", { CHECK: "The path cannot be empty." })
    }
}
