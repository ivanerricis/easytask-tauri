import i18n from "@/i18n"
import type { AudioFile } from "@/types/types";
import { createError, handleDBError, toAppError } from "@/types/error";
import { getErrorMessage } from "@/lib/utils";
import { getDB } from "../dbManager";
import { nextPositionSql } from "./sql";
import { uniqueName } from "./names";

/**
 * Extensions (lowercase, without dot) of the audio files that can be attached to a group.
 * Kept in sync with the allow list of the Rust commands audio_file_exists / allow_audio_file.
 * @category Database Queries
 */
export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"] as const

const COLUMNS = "id, section_groupID, name, path, position, creation_date, creation_time"
// The same columns for a query on `audio_file a` joined with other tables
const AUDIO_COLUMNS = COLUMNS.split(", ").map(column => `a.${column}`).join(", ")

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
    return uniqueName(name, taken, (original, attempt) => {
        const dot = original.lastIndexOf(".")
        const base = dot > 0 ? original.slice(0, dot) : original
        const extension = dot > 0 ? original.slice(dot) : ""
        return `${base} (${attempt + 1})${extension}`
    }, { caseInsensitive: true })
}

/**
 * Retrieves the audio files of a group (not deleted), in position order. Nothing for an archived group.
 * @param groupId The ID of the group.
 * @category Database Queries
 */
export async function getDBGroupAudioFiles(groupId: number): Promise<AudioFile[]> {
    try {
        const db = await getDB()
        return await db.select<AudioFile[]>(
            `SELECT ${AUDIO_COLUMNS} FROM audio_file a INNER JOIN section_group g ON g.id = a.section_groupID
             WHERE a.section_groupID = ? AND a.deleted_at IS NULL AND g.archived_at IS NULL
             ORDER BY a.position, a.id`,
            [groupId])
    } catch (error: unknown) {
        throw createError("AUDIO_LOAD_FAILED", i18n.t("errors.audio.loadFiles", { message: getErrorMessage(error) }))
    }
}

/**
 * Retrieves the audio files of every visible group of a note (neither deleted nor archived), grouped by group ID (not deleted files only).
 * Groups without audio files have no entry.
 * @param noteId The ID of the note.
 * @category Database Queries
 */
export async function getDBNoteAudioFiles(noteId: number): Promise<Record<number, AudioFile[]>> {
    try {
        const db = await getDB()
        const rows = await db.select<AudioFile[]>(
            `SELECT ${AUDIO_COLUMNS} FROM audio_file a INNER JOIN section_group g ON g.id = a.section_groupID
             WHERE g.noteID = ? AND g.deleted_at IS NULL AND g.archived_at IS NULL AND a.deleted_at IS NULL
             ORDER BY a.section_groupID, a.position, a.id`, [noteId])

        const byGroup: Record<number, AudioFile[]> = {}
        for (const row of rows) (byGroup[row.section_groupID] ??= []).push(row)
        return byGroup
    } catch (error: unknown) {
        throw createError("AUDIO_LOAD_FAILED", i18n.t("errors.audio.loadFiles", { message: getErrorMessage(error) }))
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
        throw createError("AUDIO_LOAD_FAILED", i18n.t("errors.audio.loadFile", { message: getErrorMessage(error) }))
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
             SELECT ?, ?, ?, ${nextPositionSql("audio_file", "section_groupID = ? AND deleted_at IS NULL")}`,
            [groupId, name, path, groupId])

        const created = result.lastInsertId !== undefined ? await getDBAudioFile(result.lastInsertId) : null
        if (!created) throw createError("AUDIO_UNKNOWN_ERROR", i18n.t("errors.audio.notCreated"))
        return created
    } catch (error: unknown) {
        throw toAppError(error, e => handleDBError(e, "AUDIO", {
            UNIQUE: i18n.t("errors.audio.unique"),
            CHECK: i18n.t("errors.audio.checkCreate"),
        }))
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
        handleDBError(error, "AUDIO", { CHECK: i18n.t("errors.audio.checkPath") })
    }
}
