import i18n from "@/i18n"
import { createError } from "@/types/error"
import { getErrorMessage } from "@/lib/utils"
import { isAutomationAction, isAutomationTrigger, type Automation, type AutomationDraft } from "@/lib/automations/types"
import { getDB } from "../dbManager"
import { runTransaction, type TxStatement } from "../transaction"

type AutomationRow = {
    id: number
    noteID: number
    name: string | null
    enabled: number | boolean
    trigger: string
    actions: string
    position: number
}

const parse = (text: string): unknown => {
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

/** A row as a rule, or null when its JSON is not valid (such a row is ignored, never run). */
function toAutomation(row: AutomationRow): Automation | null {
    const trigger = parse(row.trigger)
    const actions = parse(row.actions)
    if (!isAutomationTrigger(trigger) || !Array.isArray(actions) || !actions.every(isAutomationAction)) return null
    return {
        id: row.id, noteId: row.noteID, name: row.name?.trim() || null, enabled: !!row.enabled,
        trigger, actions, position: row.position,
    }
}

const fail = (key: "load" | "save" | "delete", error: unknown): never => {
    throw createError(`AUTOMATION_${key.toUpperCase()}_FAILED`, i18n.t(`automations.errors.${key}`, { message: getErrorMessage(error) }))
}

/**
 * The rules of a note, in their order. Rows with an invalid content are left out.
 * @param noteId The note.
 * @category Database Queries
 */
export async function getDBAutomations(noteId: number): Promise<Automation[]> {
    try {
        const db = await getDB()
        const rows = await db.select<AutomationRow[]>(
            "SELECT id, noteID, name, enabled, trigger, actions, position FROM automation WHERE noteID = ? ORDER BY position, id", [noteId])
        return rows.map(toAutomation).filter(rule => rule !== null)
    } catch (error: unknown) {
        return fail("load", error)
    }
}

/**
 * Creates a rule, after the other rules of the note.
 * @returns The id of the new rule.
 * @category Database Queries
 */
export async function createDBAutomation(noteId: number, draft: AutomationDraft): Promise<number> {
    try {
        const db = await getDB()
        const result = await db.execute(
            `INSERT INTO automation (noteID, name, enabled, trigger, actions, position)
             SELECT ?, ?, ?, ?, ?, COALESCE(MAX(position) + 1, 0) FROM automation WHERE noteID = ?`,
            [noteId, draft.name?.trim() || null, draft.enabled ? 1 : 0, JSON.stringify(draft.trigger), JSON.stringify(draft.actions), noteId])
        return result.lastInsertId as number
    } catch (error: unknown) {
        return fail("save", error)
    }
}

/**
 * Replaces the content of a rule (its note and position do not change).
 * @category Database Queries
 */
export async function updateDBAutomation(id: number, draft: AutomationDraft): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("UPDATE automation SET name = ?, enabled = ?, trigger = ?, actions = ? WHERE id = ?",
            [draft.name?.trim() || null, draft.enabled ? 1 : 0, JSON.stringify(draft.trigger), JSON.stringify(draft.actions), id])
    } catch (error: unknown) {
        fail("save", error)
    }
}

/**
 * Turns a rule on or off.
 * @category Database Queries
 */
export async function setDBAutomationEnabled(id: number, enabled: boolean): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("UPDATE automation SET enabled = ? WHERE id = ?", [enabled ? 1 : 0, id])
    } catch (error: unknown) {
        fail("save", error)
    }
}

/**
 * Deletes a rule for good (rules have no trash).
 * @category Database Queries
 */
export async function deleteDBAutomation(id: number): Promise<void> {
    try {
        const db = await getDB()
        await db.execute("DELETE FROM automation WHERE id = ?", [id])
    } catch (error: unknown) {
        fail("delete", error)
    }
}

/**
 * Writes the task changes computed for an automation (see diffTaskStatements) in one transaction.
 * @category Database Queries
 */
export async function applyDBTaskChanges(statements: TxStatement[]): Promise<void> {
    try {
        await runTransaction(statements)
    } catch (error: unknown) {
        fail("save", error)
    }
}
