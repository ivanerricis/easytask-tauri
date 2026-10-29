import i18n from "@/i18n"
import { handleDBError } from "@/types/error";

type ErrorMessages = Parameters<typeof handleDBError>[2]

/**
 * Runs a query function and turns any failure into the documented `<PREFIX>_*` application error (see handleDBError).
 * `messages` is a function so that the translations are read when an error happens (the language can change at runtime).
 * @param prefix The entity prefix of the error codes, e.g. "TASK" gives TASK_EXISTS / TASK_CHECK_FAILED.
 * @param messages The messages for the UNIQUE / CHECK / NOT NULL failures.
 * @param fn The body: everything that can fail (getDB included).
 * @category Database Queries
 */
export async function withDBErrors<T>(prefix: string, messages: () => ErrorMessages, fn: () => Promise<T>): Promise<T> {
    try {
        return await fn()
    } catch (error: unknown) {
        return handleDBError(error, prefix, messages())
    }
}

// The UNIQUE / CHECK messages of the entities whose create/update queries share them
export const TASK_MESSAGES = (): ErrorMessages => ({ UNIQUE: i18n.t("errors.task.unique"), CHECK: i18n.t("errors.task.check") })
export const SECTION_MESSAGES = (): ErrorMessages => ({ UNIQUE: i18n.t("errors.section.unique"), CHECK: i18n.t("errors.section.check") })
export const FOLDER_MESSAGES = (): ErrorMessages => ({ UNIQUE: i18n.t("errors.folder.unique"), CHECK: i18n.t("errors.folder.check") })
export const NOTE_MESSAGES = (): ErrorMessages => ({ UNIQUE: i18n.t("errors.note.unique"), CHECK: i18n.t("errors.note.check") })
export const WORKSPACE_MESSAGES = (): ErrorMessages => ({ UNIQUE: i18n.t("errors.workspace.unique"), CHECK: i18n.t("errors.workspace.check") })
