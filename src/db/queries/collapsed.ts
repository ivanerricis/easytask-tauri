import i18n from "@/i18n"
import { createError } from "@/types/error"
import { getErrorMessage } from "@/lib/utils"
import { getDB } from "../dbManager"

/** The tables that keep the open/closed state of their rows. A fixed list: the table name is never user input. */
const COLLAPSIBLE_TABLES = { group: "section_group", section: "section", task: "task" } as const

/** The elements whose open/closed state is saved. */
export type CollapsibleKind = keyof typeof COLLAPSIBLE_TABLES

/**
 * Saves the open/closed state of a group, a section or a task. It is a state of the view: it does not change the edit
 * dates (the triggers of the tables ignore the column) and it is not part of what duplicates, templates and exports carry.
 * @param kind What is saved.
 * @param id The ID of the row.
 * @param collapsed True when it is closed.
 * @category Database Queries
 */
export async function setDBCollapsed(kind: CollapsibleKind, id: number, collapsed: boolean) {
    try {
        const table = COLLAPSIBLE_TABLES[kind]
        if (!table) throw new Error(`Unsupported item: ${String(kind)}`)
        const db = await getDB()
        await db.execute(`UPDATE ${table} SET collapsed = ? WHERE id = ?`, [collapsed ? 1 : 0, id])
    } catch (error: unknown) {
        throw createError("COLLAPSED_UPDATE_ERROR", i18n.t("errors.collapsed.save", { message: getErrorMessage(error) }))
    }
}

/** Saves whether a group is closed. */
export const setDBGroupCollapsed = (groupId: number, collapsed: boolean) => setDBCollapsed("group", groupId, collapsed)

/** Saves whether a section is closed. */
export const setDBSectionCollapsed = (sectionId: number, collapsed: boolean) => setDBCollapsed("section", sectionId, collapsed)

/** Saves whether the subtasks of a task are closed (hidden). */
export const setDBTaskCollapsed = (taskId: number, collapsed: boolean) => setDBCollapsed("task", taskId, collapsed)
